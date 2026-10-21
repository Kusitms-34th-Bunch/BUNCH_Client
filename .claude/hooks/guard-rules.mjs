import { readFileSync } from 'node:fs';

let payload;

try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const toolName = payload.tool_name ?? '';
const toolInput = payload.tool_input ?? {};
const filePath = toolInput.file_path ?? '';
const content = toolInput.new_string ?? toolInput.content ?? toolInput.command ?? '';
const isCodeFile = /\.(ts|tsx|js|jsx)$/.test(filePath);
const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);
const isGeneratedFile = /(^|\/)generated\//.test(filePath);

function deny(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

if (isCodeFile && !isTestFile && content.includes('console.log')) {
  deny('디버그 로그를 제거하고 구조화된 오류 처리를 사용하세요.');
}

if (isCodeFile && !isGeneratedFile && /:\s*any([^A-Za-z]|$)|<any>|as any/.test(content)) {
  deny('명시적 any 대신 구체적인 타입 또는 unknown을 사용하세요.');
}

// docs/conventions/coding.md의 주석 명사형 끝맺음 검사(생성기 출력 제외)
// 줄 앞·JSX·코드 뒤 주석에서 한글 뒤 `다`로 끝나는 줄(괄호 덧붙임 포함) 차단. `바다` 같은 명사 오탐은 감수
const isCommentCheckableFile = /\.(ts|tsx|js|jsx|css)$/.test(filePath);
const sentenceFormComment =
  /(^\s*(\/\*+|\*|\{\/\*)|(^|\s)\/\/).*[가-힣]다(\([^)]*\))?\.?\s*(\*\/\}?)?\s*$/;
const isGeneratedContent = /^\s*\/\/\s*@generated/m.test(content);

if (isCommentCheckableFile && !isGeneratedFile && !isGeneratedContent) {
  const offendingLine = content.split('\n').find((line) => sentenceFormComment.test(line));
  if (offendingLine) {
    deny(
      `주석은 명사형으로 끝내세요(예: ~처리, ~방지, ~적용, docs/conventions/coding.md). 문장형으로 끝난 줄: "${offendingLine.trim()}"`,
    );
  }
}

// apps/mobile-shell은 Expo/Metro가 Yarn PnP를 지원하지 않아 pnpm을 쓰는 예외다.
// docs/architecture/mobile-shell.md, docs/decisions/records/003-mobile-shell-pnpm-exception.md 참고.
const targetsMobileShell = /apps\/mobile-shell/.test(content);

if (toolName === 'Bash' && !targetsMobileShell && /(^|\s)(npm|pnpm|npx)\s/.test(content)) {
  deny(
    '이 프로젝트는 Yarn 4 PnP만 사용합니다. npm, pnpm, npx 대신 yarn을 사용하세요(단, apps/mobile-shell은 예외).',
  );
}

// ── git 위험 명령 ────────────────────────────────────────────────────────────
// 요청 범위 밖 변경이 커밋에 섞이거나, 이력이 덮어써지거나, 커밋·푸시 hook이 우회되는 일을 막는다.
// 사람이 터미널에서 직접 실행하는 건 막지 않는다. 막힌 이유는 agent에게 전달되고, 필요하면 사용자에게 확인을 받는다.
// 따옴표 안 문자열(커밋 메시지 등)과 heredoc 본문은 명령이 아니므로 걷어낸 뒤 명령 단위로 본다.
// ponytail: 정규식 기반이라 `sh -c "git ..."`처럼 따옴표로 감싼 명령은 못 본다. 방어의 한 겹일 뿐이다.
function stripNonCommandText(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n[ \t]*\2(?=\n|$)/g, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function gitCommands(command) {
  const commands = [];

  for (const segment of stripNonCommandText(command).split(/&&|\|\||[;|\n]/)) {
    const words = segment.trim().split(/\s+/).filter(Boolean);

    while (words.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
    if (words[0] !== 'git') continue;

    let index = 1;

    while (index < words.length && words[index].startsWith('-')) {
      index += ['-C', '-c', '--git-dir', '--work-tree'].includes(words[index]) ? 2 : 1;
    }

    if (index < words.length) commands.push({ sub: words[index], args: words.slice(index + 1) });
  }

  return commands;
}

// `-am`, `-fu`처럼 묶인 짧은 옵션 안에 문자가 있는지 본다.
const hasShort = (args, letter) =>
  args.some((arg) => /^-[A-Za-z]+$/.test(arg) && arg.includes(letter));
const isMainRef = (arg) => /^\+?(?:[^:\s]+:)?(?:refs\/heads\/)?(?:main|master)$/.test(arg);

if (toolName === 'Bash') {
  const command = toolInput.command ?? '';

  if (/(^|\s)HUSKY=0(\s|$)/.test(stripNonCommandText(command))) {
    deny('HUSKY=0으로 git hook을 끄지 않습니다. hook이 실패하면 원인을 고치세요.');
  }

  // heredoc 본문까지 보려고 걷어내기 전 원문을 검사한다.
  const writesMessage = /\bgit\s+(?:-\S+\s+)*commit\b|\bgh\s+pr\s+(?:create|edit)\b/.test(command);
  const aiAttribution =
    /co-authored-by:[^\n]*(?:claude|anthropic|copilot|codex|openai|chatgpt)|generated (?:with|by)[^\n]*(?:claude|codex|copilot|chatgpt)/i;

  if (writesMessage && aiAttribution.test(command)) {
    deny(
      '커밋 메시지와 PR 본문에 Co-Authored-By, Generated with 같은 AI 출처 문구를 넣지 않습니다(docs/conventions/commit.md).',
    );
  }

  for (const { sub, args } of gitCommands(command)) {
    const has = (...flags) => flags.some((flag) => args.includes(flag));

    if (
      (sub === 'commit' || sub === 'push') &&
      (has('--no-verify') || (sub === 'commit' && hasShort(args, 'n')))
    ) {
      deny('--no-verify로 husky hook을 건너뛰지 않습니다. hook이 실패하면 원인을 고치세요.');
    }

    if (sub === 'push') {
      const forced =
        has('--force') || hasShort(args, 'f') || args.some((arg) => /^\+[^+]/.test(arg));

      if (forced && !args.some((arg) => arg.startsWith('--force-with-lease'))) {
        deny(
          '강제 푸시는 --force-with-lease로만 합니다. --force는 그사이 다른 사람이 올린 커밋을 말없이 지웁니다.',
        );
      }

      if (args.filter((arg) => !arg.startsWith('-')).some(isMainRef)) {
        deny(
          'main·master에는 직접 push하지 않습니다. 작업 브랜치에서 PR을 여세요(docs/conventions/git.md).',
        );
      }
    }

    if (
      sub === 'add' &&
      (args.some((arg) => ['.', './', '*', ':/', '--all', '--update'].includes(arg)) ||
        hasShort(args, 'A') ||
        hasShort(args, 'u'))
    ) {
      deny(
        'git add는 폴더·전체 단위(., -A, -u)로 하지 않습니다. 내가 바꾼 파일 경로를 하나씩 적어 add하세요. 요청 범위 밖 변경이 섞이지 않게 합니다.',
      );
    }

    if (sub === 'commit' && (has('--all') || hasShort(args, 'a'))) {
      deny(
        'git commit -a는 금지입니다. 추적 중인 수정 파일이 전부 담겨 요청 범위 밖 변경이 섞입니다. 파일 경로를 적어 git add한 뒤 -a 없이 커밋하세요.',
      );
    }

    if (
      (sub === 'reset' && has('--hard')) ||
      (sub === 'clean' && (has('--force') || hasShort(args, 'f'))) ||
      ((sub === 'checkout' || sub === 'switch') &&
        (has('--force', '--discard-changes') || hasShort(args, 'f'))) ||
      (sub === 'checkout' && args.includes('.')) ||
      (sub === 'restore' && args.includes('.') && !has('--staged') && !hasShort(args, 'S'))
    ) {
      deny(
        '커밋 안 된 변경을 되돌릴 수 없게 지우는 명령입니다. 지울 파일 경로를 직접 지정하거나, 사용자에게 먼저 확인받은 뒤 사용자가 직접 실행하게 하세요.',
      );
    }

    if (sub === 'stash' && ['pop', 'drop', 'clear'].includes(args[0])) {
      deny(
        'git stash pop·drop·clear는 막습니다. stash는 다른 작업과 함께 쓰이므로 git stash list로 항목을 확인한 뒤 git stash apply로 적용하고, 정리는 사용자에게 확인받으세요.',
      );
    }

    if (
      sub === 'branch' &&
      (has('--delete') || hasShort(args, 'D')) &&
      (has('--force') || hasShort(args, 'D'))
    ) {
      deny('git branch -D는 병합되지 않은 커밋을 잃을 수 있습니다. 사용자에게 먼저 확인받으세요.');
    }
  }
}

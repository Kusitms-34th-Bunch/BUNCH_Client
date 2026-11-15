// 시점에 따라 바뀌는 서술(「연결 전」「아직 없음」「미병합」 등)에 확인 근거(이슈 번호·날짜)가 있는지 알림
// agent는 문서·주석을 사실로 믿고 코드를 쓰므로, 낡은 서술이 언제 확인한 것인지 보이게 함(docs/conventions/writing.md)
// 막지 않고 경고만 함. `--list`를 주면 전체 목록, 없으면 개수와 앞부분만
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ROOTS = ['docs', 'apps/web/src', 'apps/mobile-shell/src', 'packages', '.agents/skills'];
// 기록·보관 문서는 그 시점의 사실이라 제외
const SKIP = [
  'docs/archive/',
  'docs/decisions/records/',
  'docs/troubleshooting/records/',
  'node_modules',
  'generated',
  // ponytail: 팀원 작업 중인 feature는 그 작업이 머지된 뒤 정리
  'apps/web/src/features/bundle/',
];
// 지금 상태를 단정하는 서술어만 잡음(「아직 없는 route가 있으면」 같은 규칙·조건, 「API 연결 전 fixture」 같은 수식은 제외)
const PHRASES =
  /미병합|운영 미배포|아직 없(?:다|어|고|으며|음|습니다|었)|연결 전(?:이다|이라|이며|이고|이어|까지는|에는|이다\.)|(?:API|계약)(?:가|이|에)? 없(?:어|다|고|으며|음)/;
// 확인 근거: 이슈·PR 번호(#123) 또는 날짜(2026-11-16)
const ANCHOR = /#\d+|20\d\d-\d\d-\d\d/;

const files = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(md|tsx?|mjs)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
};

const found = [];
for (const base of ROOTS) {
  for (const file of files(join(root, base))) {
    const rel = relative(root, file);
    if (SKIP.some((skip) => rel.includes(skip))) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        // 코드 파일은 주석 줄만 봄(문자열·화면 문구 제외)
        if (!rel.endsWith('.md') && !/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (PHRASES.test(line) && !ANCHOR.test(line)) found.push(`${rel}:${index + 1}`);
      });
  }
}

if (found.length > 0) {
  const list = process.argv.includes('--list');
  console.warn(
    `확인 근거(이슈 번호·날짜) 없는 시점 의존 서술 ${found.length}곳(경고, 막지 않음). 지금도 맞으면 근거를 붙이고, 틀리면 고칩니다(docs/conventions/writing.md):`,
  );
  console.warn((list ? found : found.slice(0, 10)).map((item) => `  - ${item}`).join('\n'));
  if (!list && found.length > 10)
    console.warn(`  … 전체는 node .agents/scripts/check-stale-notes.mjs --list`);
}

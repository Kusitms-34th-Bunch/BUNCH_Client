// 300줄을 넘는 컴포넌트·hook에 분리 검토를 알림(docs/code-quality/component-logic.md 「파일 크기」)
// 막지 않고 경고만 함. 나누지 않기로 했으면 파일 맨 위에 `// 크기 유지: <이유>`
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const LIMIT = 300;
const KEEP = '크기 유지:';
// 설정 표·가짜 서버는 한곳에 모여 있는 편이 읽기 쉬워 제외
const SKIP = ['mocks/', 'app/(app)/AppTransitions.tsx'];

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith('.') ? [] : files(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [path] : [];
  });

const large = files(SRC)
  .map((file) => ({ rel: relative(SRC, file), text: readFileSync(file, 'utf8') }))
  .filter(({ rel }) => !SKIP.some((skip) => rel.startsWith(skip)))
  .map(({ rel, text }) => ({ rel, lines: text.split('\n').length - 1, text }))
  .filter(({ lines, text }) => lines > LIMIT && !text.slice(0, 500).includes(KEEP));

if (large.length > 0) {
  console.warn(
    `${LIMIT}줄을 넘는 파일 ${large.length}개(경고, 막지 않음). 변경 이유가 둘 이상이면 나누고, 나누지 않으면 맨 위에 \`// ${KEEP} <이유>\`(docs/code-quality/component-logic.md 「파일 크기」):\n${large.map(({ rel, lines }) => `  - src/${rel} ${lines}줄`).join('\n')}`,
  );
}

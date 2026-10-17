import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 디자인 시스템 컴포넌트는 `yarn gen:ds-component <Name>`이 만드는 구조(4개 파일)를 따라야 한다.
// generator를 건너뛰고 손으로 만든 폴더를 CI에서 잡는다.
// 구역: core(모든 앱), web(apps/web 전용). 구역 폴더가 늘면 아래 목록에도 추가한다.
const ZONES = ['core', 'web'].map((zone) =>
  join('packages', 'design-system', 'src', 'components', zone),
);

// 폴더 경로가 바뀌면 이 검사가 조용히 꺼진다. design-system의 구역 경로를 옮기면 위 경로도 함께 고친다.
const zoneDirs = ZONES.filter((dir) => existsSync(dir));
if (zoneDirs.length === 0) {
  console.log('컴포넌트 폴더가 없어 구조 검사를 건너뜁니다.');
  process.exit(0);
}

const problems = [];

for (const COMPONENTS_DIR of zoneDirs)
  for (const dir of readdirSync(COMPONENTS_DIR)) {
    if (!statSync(join(COMPONENTS_DIR, dir)).isDirectory()) continue;

    // generator는 폴더를 camelCase, 파일을 PascalCase로 만든다. 대소문자 구분이 없는 macOS·Windows에서 만든 폴더가 Linux CI에서야 드러나지 않게 이름 형식도 확인한다.
    if (!/^[a-z][A-Za-z0-9]*$/.test(dir)) {
      problems.push(
        `  - ${COMPONENTS_DIR}/${dir}: 폴더 이름은 camelCase여야 합니다 (예: userAvatar)`,
      );
      continue;
    }

    const name = dir[0].toUpperCase() + dir.slice(1);
    const expected = [`${name}.tsx`, `${name}.test.tsx`, `${name}.stories.tsx`, 'index.ts'];
    const missing = expected.filter((file) => !existsSync(join(COMPONENTS_DIR, dir, file)));

    if (missing.length > 0)
      problems.push(`  - ${COMPONENTS_DIR}/${dir}: ${missing.join(', ')} 없음`);
  }

if (problems.length > 0) {
  console.error('디자인 시스템 컴포넌트 구조가 generator 결과와 다릅니다:\n');
  console.error(problems.join('\n'));
  console.error('\n  새 컴포넌트는 `yarn gen:ds-component <PascalCase 이름>`으로 만드세요.');
  process.exit(1);
}

console.log('디자인 시스템 컴포넌트 구조가 올바릅니다.');

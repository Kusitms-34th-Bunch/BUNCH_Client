// feature끼리의 예외 import(eslint.config.mjs FEATURE_IMPORT_EXCEPTIONS)가 늘지 않게 개수 상한 검사
// 예외는 shared로 옮기며 줄이는 대상이라 새로 늘리면 실패, 줄었으면 아래 상한도 같이 낮춤
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEATURES = fileURLToPath(new URL('../src/features', import.meta.url));
// [import하는 feature, import되는 feature, 상한(import 문 수, 2026-11-16 기준)]
const LIMITS = [
  ['bundle', 'photo-box', 55],
  ['bunch-home', 'bundle', 2],
  ['photo-box', 'bundle', 3],
];

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const problems = [];
// eslint.config.mjs의 예외 목록과 이 상한 표가 같은 쌍을 다루는지 확인(한쪽에만 추가되지 않게)
const eslintConfig = readFileSync(new URL('../eslint.config.mjs', import.meta.url), 'utf8');
const exceptionBlock = /FEATURE_IMPORT_EXCEPTIONS = \{([^}]*)\}/.exec(eslintConfig)?.[1] ?? '';
const configured = [...exceptionBlock.matchAll(/['"]?([\w-]+)['"]?\s*:\s*\[([^\]]*)\]/g)].flatMap(
  ([, from, list]) => [...list.matchAll(/['"]([\w-]+)['"]/g)].map(([, to]) => `${from}→${to}`),
);
const limited = LIMITS.map(([from, to]) => `${from}→${to}`);
for (const pair of configured.filter((item) => !limited.includes(item))) {
  problems.push(`  - ${pair}: eslint 예외에는 있지만 상한 표(LIMITS)에 없습니다`);
}
for (const pair of limited.filter((item) => !configured.includes(item))) {
  problems.push(
    `  - ${pair}: 상한 표에는 있지만 eslint 예외에 없습니다(예외를 없앴다면 표에서도 지웁니다)`,
  );
}
for (const [from, to, limit] of LIMITS) {
  // 줄 첫머리의 정적 import·export 선언만 셈(부수 효과 import 포함, 주석·동적 import()·문자열 제외)
  const pattern = new RegExp(
    `^\\s*(?:import|export)\\b(?:[^;'"]*?\\bfrom)?\\s*['"]@/features/${to}(?:/[^'"]*)?['"]`,
    'gm',
  );
  const count = sourceFiles(join(FEATURES, from)).reduce(
    (sum, file) => sum + (readFileSync(file, 'utf8').match(pattern)?.length ?? 0),
    0,
  );
  if (count > limit) problems.push(`  - ${from} → ${to}: ${count}개(상한 ${limit}개)`);
  else if (count < limit) {
    problems.push(`  - ${from} → ${to}: ${count}개로 줄었습니다. 상한도 ${count}로 낮춰 주세요`);
  }
}

if (problems.length > 0) {
  console.error(
    `feature 예외 import 개수가 상한과 다릅니다(scripts/check-feature-exceptions.mjs, docs/architecture/domain-ownership.md):\n${problems.join('\n')}`,
  );
  process.exit(1);
}

import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// web 빌드 산출물의 클라이언트 JS 크기(gzip)를 기록하고 기준선보다 10% 넘게 커지면 경고(실패시키지 않음)
// ANALYZE=true 빌드면 패키지·소스 폴더별 크기로 무엇이 커졌는지도 표로 남김
// 기준선 갱신: 의도한 증가면 `ANALYZE=true yarn workspace @app/web build` 뒤 `--update`로 갱신해 커밋
const repositoryRoot = resolve(import.meta.dirname, '..');
const nextDir = resolve(repositoryRoot, 'apps/web/.next');
const baselinePath = resolve(repositoryRoot, 'apps/web/bundle-size-baseline.json');
const TOLERANCE = 0.1;

const manifestPath = join(nextDir, 'build-manifest.json');
if (!existsSync(manifestPath)) {
  console.log('apps/web 빌드 산출물이 없어 번들 크기를 측정하지 않습니다.');
  // 기준선 갱신을 요청했는데 측정하지 못했으면 실패로 알림
  process.exit(process.argv.includes('--update') ? 1 : 0);
}

const gzipSize = (file) => gzipSync(readFileSync(join(nextDir, file))).length;
const listJs = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listJs(path);
    return name.endsWith('.js') ? [path] : [];
  });

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
// 모든 화면이 처음에 함께 받는 공통 JS(프레임워크·런타임). polyfill은 nomodule이라 최신 브라우저·WebView가 받지 않아 제외
const shared = (manifest.rootMainFiles ?? []).reduce((sum, file) => sum + gzipSize(file), 0);
// 화면별로 나뉜 청크까지 포함한 전체 클라이언트 JS
const total = listJs(join(nextDir, 'static/chunks')).reduce(
  (sum, path) => sum + gzipSync(readFileSync(path)).length,
  0,
);
// 모듈 경로를 패키지(node_modules 아래 이름) 또는 저장소 소스 폴더로 묶음
const ownerOf = (modulePath) => {
  let path = modulePath;
  // 합쳐진 모듈의 자식은 `<루트> + N modules (concatenated)/<자식>`이라 마지막 자식 경로로만 판정
  const marker = '(concatenated)/';
  const at = path.lastIndexOf(marker);
  if (at >= 0) path = path.slice(at + marker.length);
  const packages = [...path.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)];
  if (packages.length > 0) return packages.at(-1)[1];
  const source = path.match(/(?:^|\/)(src\/[^/\s]+(?:\/[^/\s]+)?|packages\/[^/\s]+)/);
  return source ? source[1] : 'other';
};
const analysisPath = join(nextDir, 'analyze/client.json');
const owners = {};
if (existsSync(analysisPath)) {
  const walk = (node) => {
    if (node.groups?.length) return node.groups.forEach(walk);
    if (typeof node.gzipSize !== 'number') return;
    const owner = ownerOf(node.path ?? node.label ?? '');
    owners[owner] = (owners[owner] ?? 0) + node.gzipSize;
  };
  JSON.parse(readFileSync(analysisPath, 'utf8')).forEach(walk);
}
// 1KB 미만은 기준선에서 빼 파일 크기를 줄임
const ownerSizes = Object.fromEntries(
  Object.entries(owners)
    .filter(([, size]) => size >= 1024)
    .sort(([, a], [, b]) => b - a),
);
const current = { sharedFirstLoadGzip: shared, totalClientJsGzip: total, owners: ownerSizes };

if (process.argv.includes('--update')) {
  writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`기준선을 갱신했습니다: ${JSON.stringify(current)}`);
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : {};
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const rows = [
  ['공통 첫 로드 JS', 'sharedFirstLoadGzip'],
  ['전체 클라이언트 JS', 'totalClientJsGzip'],
].map(([label, key]) => {
  const base = baseline[key];
  const ratio = typeof base === 'number' && base > 0 ? (current[key] - base) / base : undefined;
  const over = ratio !== undefined && ratio > TOLERANCE;
  if (over) {
    console.log(
      `::warning title=웹 번들 크기::${label}가 기준선보다 ${(ratio * 100).toFixed(1)}% 커졌습니다(${kb(base)} → ${kb(current[key])}).`,
    );
  }
  const change =
    ratio === undefined ? '기준선 없음' : `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%`;
  return `| ${label} | ${kb(current[key])} | ${typeof base === 'number' ? kb(base) : '-'} | ${change}${over ? ' ⚠️' : ''} |`;
});

const ownerRows = (entries) =>
  entries.map(
    ([owner, size, delta]) =>
      `| \`${owner}\` | ${kb(size)} | ${delta === undefined ? '-' : `${delta >= 0 ? '+' : ''}${kb(delta)}`} |`,
  );
const ownerSection = [];
if (Object.keys(ownerSizes).length > 0) {
  const baseOwners = baseline.owners ?? {};
  const grown = Object.entries(ownerSizes)
    .map(([owner, size]) => [owner, size, size - (baseOwners[owner] ?? 0)])
    .filter(([, , delta]) => delta >= 1024)
    .sort(([, , a], [, , b]) => b - a)
    .slice(0, 10);
  ownerSection.push(
    '### 기준선보다 많이 커진 항목',
    '',
    grown.length > 0
      ? ['| 패키지·소스 폴더 | 현재 | 증가 |', '| --- | --- | --- |', ...ownerRows(grown)].join(
          '\n',
        )
      : '1KB 넘게 커진 항목이 없습니다.',
    '',
    '### 가장 큰 항목',
    '',
    '| 패키지·소스 폴더 | 현재 | 기준선 대비 |',
    '| --- | --- | --- |',
    ...ownerRows(
      Object.entries(ownerSizes)
        .slice(0, 10)
        .map(([owner, size]) => [
          owner,
          size,
          owner in baseOwners ? size - baseOwners[owner] : undefined,
        ]),
    ),
    '',
  );
}

const summary = [
  '## 웹 번들 크기 (gzip)',
  '',
  '| 항목 | 현재 | 기준선 | 변화 |',
  '| --- | --- | --- | --- |',
  ...rows,
  '',
  ...ownerSection,
  '패키지·소스 폴더 크기는 모듈마다 따로 잰 gzip이라 합이 전체 크기와 맞지 않습니다. 증가량 비교용입니다.',
  '',
  `기준선보다 ${TOLERANCE * 100}% 넘게 커지면 경고만 하고 실패시키지 않습니다. 의도한 증가면 \`ANALYZE=true yarn workspace @app/web build\` 뒤 \`node scripts/report-web-bundle-size.mjs --update\`로 기준선을 갱신해 커밋합니다.`,
  '',
].join('\n');

console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

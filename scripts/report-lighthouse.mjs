import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// `lhci collect`가 남긴 결과(.lighthouseci/lhr-*.json)로 페이지별 점수·기준선 차이·통과하지 못한 항목을 기록(실패시키지 않음)
// 기준선: CI는 develop push 측정이 `--update`로 저장한 결과를 캐시로 받아 비교(머지될 때마다 자동 갱신, 커밋하지 않음)
// 로컬 재현 절차는 docs/workflows/ci.md 「Lighthouse 결과 댓글」
const repositoryRoot = resolve(import.meta.dirname, '..');
const resultsDir = resolve(repositoryRoot, process.env.LIGHTHOUSE_RESULTS ?? '.lighthouseci');
const baselinePath = resolve(repositoryRoot, 'apps/web/lighthouse-baseline.json');
const CATEGORIES = [
  ['performance', '성능'],
  ['accessibility', '접근성'],
  ['best-practices', '권장사항'],
  ['seo', 'SEO'],
];
// 페이지당 보여 줄 통과하지 못한 항목 수
const MAX_AUDITS = 5;
// 페이지당 1번 측정이라 성능 점수는 이만큼은 흔들릴 수 있음(이 안의 차이는 변화 없음으로 봄)
// 2026-11-15 같은 코드 두 실행에서 /invite 성능이 75→69로 6점 차이
const NOISE = 10;

const update = process.argv.includes('--update');
const files = existsSync(resultsDir)
  ? readdirSync(resultsDir).filter((name) => /^lhr-.*\.json$/.test(name))
  : [];
if (files.length === 0) {
  console.log('Lighthouse 결과가 없어 보고하지 않습니다.');
  // 기준선 갱신을 요청했는데 측정 결과가 없으면 실패로 알림
  process.exit(update ? 1 : 0);
}

const pathOf = (url) => new URL(url).pathname;
const runs = files
  .map((name) => JSON.parse(readFileSync(join(resultsDir, name), 'utf8')))
  .map((report) => ({
    path: pathOf(report.requestedUrl),
    // Lighthouse가 페이지 하나를 측정하는 데 쓴 시간(Chrome·프로세스 시작 제외)
    seconds: (report.timing?.total ?? 0) / 1000,
    finalPath: pathOf(report.finalDisplayedUrl ?? report.finalUrl ?? report.requestedUrl),
    scores: Object.fromEntries(
      CATEGORIES.map(([id]) => {
        const score = report.categories[id]?.score;
        return [id, typeof score === 'number' ? Math.round(score * 100) : null];
      }),
    ),
    // 점수에 반영되는 항목 중 통과하지 못한 것, 그 카테고리 점수를 많이 깎는 순(카테고리마다 가중치 합이 달라 비율로 비교)
    audits: CATEGORIES.flatMap(([id]) => {
      const refs = (report.categories[id]?.auditRefs ?? []).filter((ref) => ref.weight > 0);
      const total = refs.reduce((sum, ref) => sum + ref.weight, 0);
      return refs.map((ref) => ({ ...report.audits[ref.id], share: ref.weight / total }));
    })
      .filter((audit) => typeof audit.score === 'number' && audit.score < 0.9)
      .sort((a, b) => (1 - b.score) * b.share - (1 - a.score) * a.share)
      .filter((audit, index, list) => list.findIndex((other) => other.id === audit.id) === index),
    // 측정하지 못한 항목의 이유(예: NO_LCP). 같은 이유로 여러 항목이 빠지므로 이유마다 가장 자세한 문구 하나
    errors: [
      ...Object.values(report.audits)
        .filter((audit) => audit.errorMessage)
        .reduce((byCode, audit) => {
          const code = audit.errorMessage.match(/\(([A-Z_]+)\)\s*$/)?.[1] ?? audit.errorMessage;
          const known = byCode.get(code);
          if (!known || audit.errorMessage.length > known.length)
            byCode.set(code, audit.errorMessage);
          return byCode;
        }, new Map())
        .values(),
    ],
  }));
// 같은 페이지를 여러 번 쟀으면(운영) 성능 점수가 중앙값인 실행 하나로(점수와 항목이 같은 실행에서 나오게)
const byPath = Map.groupBy(runs, (run) => run.path);
// 페이지마다 재려던 횟수(운영 3번). 일부 실행만 성공한 페이지는 따로 표시하고 기준선에 넣지 않음
const expectedRuns = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS ?? 1) || 1);
const pages = [...byPath.values()]
  .map((list) => ({
    ...list.toSorted((a, b) => (a.scores.performance ?? -1) - (b.scores.performance ?? -1))[
      Math.floor((list.length - 1) / 2)
    ],
    runs: list.length,
  }))
  .sort((a, b) => a.path.localeCompare(b.path));
// 결과 묶음 이름(PR 공개 페이지·로그인 화면·운영), 덧붙일 안내, 기준선 이름
const title = process.env.LIGHTHOUSE_TITLE;
// 측정을 요청한 주소 중 결과가 없는 페이지(예: 운영에 아직 배포되지 않아 404)
const missing = (process.env.LIGHTHOUSE_URLS ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .map(pathOf)
  .filter((path) => !byPath.has(path));
const incomplete = pages.filter((page) => page.runs < expectedRuns);
const note = process.env.LIGHTHOUSE_NOTE;
const baselineLabel = process.env.LIGHTHOUSE_BASELINE_LABEL ?? 'develop';

if (update) {
  // 일부 페이지가 빠진 측정으로 기준선을 덮지 않음(빠진 페이지가 다음 비교에서 사라지지 않게). 운영처럼 일부가 늘 빠질 수 있으면 허용
  const partial = [...missing, ...incomplete.map((page) => page.path)];
  if (partial.length > 0 && process.env.LIGHTHOUSE_UPDATE_PARTIAL !== 'allow') {
    console.log(`측정하지 못한 페이지가 있어 기준선을 갱신하지 않습니다: ${partial.join(', ')}`);
    process.exit(1);
  }
  // 다 잰 페이지만 바꾸고, 빠지거나 일부만 잰 페이지는 받아 둔 이전 값을 유지
  const previous = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : {};
  const baseline = {
    ...previous,
    ...Object.fromEntries(
      pages.filter((page) => page.runs >= expectedRuns).map((page) => [page.path, page.scores]),
    ),
  };
  // 저장소 일부만 받은 실행(운영 측정)에는 apps/web 폴더가 없을 수 있음
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Lighthouse 기준선을 갱신했습니다: ${baselinePath}`);
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
const cell = (page, id) => {
  const score = page.scores[id];
  if (score === null) return '-';
  const before = baseline?.[page.path]?.[id];
  if (typeof before !== 'number') return String(score);
  const diff = score - before;
  // 성능은 측정 오차 안의 차이를 표시하지 않음
  if (diff === 0 || (id === 'performance' && Math.abs(diff) < NOISE)) return String(score);
  return `${score} (${diff > 0 ? '+' : ''}${diff}${diff < 0 ? ' ⚠️' : ''})`;
};
// 페이지가 낸 문구(콘솔 오류 등)가 표·HTML·멘션·다른 댓글의 marker로 해석되지 않게, 길이도 제한
const plain = (text, max = 200) =>
  String(text)
    .slice(0, max)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('@', '&#64;')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');

const measured =
  expectedRuns > 1 ? `페이지당 ${expectedRuns}번 측정한 중앙값이지만` : '페이지당 1번 측정이라';
const lines = [
  title ? `### Lighthouse · ${title}` : '### Lighthouse',
  '',
  ...(note ? [note, ''] : []),
  baseline
    ? `${measured} 성능은 ${NOISE}점 미만의 차이를 표시하지 않습니다. 괄호는 ${baselineLabel} 기준선과의 차이입니다.`
    : `비교할 ${baselineLabel} 기준선이 없어 이번 점수만 표시합니다.`,
  '',
  `| 페이지 | ${CATEGORIES.map(([, label]) => label).join(' | ')} |`,
  `| --- | ${CATEGORIES.map(() => '---:').join(' | ')} |`,
  ...pages.map(
    (page) =>
      `| \`${page.path}\`${page.finalPath === page.path ? '' : ` → \`${page.finalPath}\``} | ${CATEGORIES.map(([id]) => cell(page, id)).join(' | ')} |`,
  ),
];

if (missing.length > 0) {
  lines.push(
    '',
    `⚠️ 측정하지 못한 페이지: ${missing.map((path) => `\`${plain(path)}\``).join(', ')}(페이지가 열리지 않음, 실행 로그 참고)`,
  );
}
if (incomplete.length > 0) {
  lines.push(
    '',
    `⚠️ 일부만 측정한 페이지: ${incomplete.map((page) => `\`${plain(page.path)}\`(${expectedRuns}번 중 ${page.runs}번)`).join(', ')}. 기준선은 이전 값을 유지합니다.`,
  );
}

for (const page of pages) {
  if (page.audits.length === 0 && page.errors.length === 0) continue;
  lines.push('', `<details><summary><code>${page.path}</code> 개선할 항목</summary>`, '');
  for (const error of page.errors)
    lines.push(`- ⚠️ 측정하지 못한 항목이 있습니다: ${plain(error)}`);
  for (const audit of page.audits.slice(0, MAX_AUDITS)) {
    // 값이 없는 항목은 첫 사례를 붙임(예: 콘솔 오류 문구)
    const example = audit.displayValue ?? audit.details?.items?.[0]?.description;
    lines.push(`- ${plain(audit.title)}${example ? ` — ${plain(example, 120)}` : ''}`);
  }
  if (page.audits.length > MAX_AUDITS) {
    lines.push(`- 그 밖에 ${page.audits.length - MAX_AUDITS}개(전체 리포트 참고)`);
  }
  lines.push('', '</details>');
}

const markdown = lines.join('\n');
console.log(markdown);
// 실행 시간 조정용(댓글에는 넣지 않음)
console.log(
  `\n측정 시간: ${pages.map((page) => `${page.path} ${page.seconds.toFixed(1)}초`).join(', ')}`,
);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
if (process.env.LIGHTHOUSE_REPORT) writeFileSync(process.env.LIGHTHOUSE_REPORT, `${markdown}\n`);

import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
const NOISE = 5;

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
const pages = files
  .map((name) => JSON.parse(readFileSync(join(resultsDir, name), 'utf8')))
  .map((report) => ({
    path: pathOf(report.requestedUrl),
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
  }))
  .sort((a, b) => a.path.localeCompare(b.path));

if (update) {
  const baseline = Object.fromEntries(pages.map((page) => [page.path, page.scores]));
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

const lines = [
  '### Lighthouse',
  '',
  baseline
    ? `페이지당 1번 측정이라 성능은 ${NOISE}점 미만의 차이를 표시하지 않습니다. 괄호는 develop 기준선과의 차이입니다.`
    : '비교할 develop 기준선이 없어 이번 점수만 표시합니다.',
  '',
  `| 페이지 | ${CATEGORIES.map(([, label]) => label).join(' | ')} |`,
  `| --- | ${CATEGORIES.map(() => '---:').join(' | ')} |`,
  ...pages.map(
    (page) =>
      `| \`${page.path}\`${page.finalPath === page.path ? '' : ` → \`${page.finalPath}\``} | ${CATEGORIES.map(([id]) => cell(page, id)).join(' | ')} |`,
  ),
];

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
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
if (process.env.LIGHTHOUSE_REPORT) writeFileSync(process.env.LIGHTHOUSE_REPORT, `${markdown}\n`);

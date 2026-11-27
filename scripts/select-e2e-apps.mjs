// PR에서 바뀐 파일로 E2E를 돌릴 앱(admin·web)을 고름(e2e.yml). 공통 패키지·설정이 바뀌면 둘 다
// 사용: git diff --name-only … | node scripts/select-e2e-apps.mjs  → GITHUB_OUTPUT에 apps·matrix
//       node scripts/select-e2e-apps.mjs --all                      → push·수동 실행(둘 다)
//       node scripts/select-e2e-apps.mjs --check                    → 판정 규칙 점검
import assert from 'node:assert/strict';
import { appendFileSync, readFileSync } from 'node:fs';

const ADMIN = ['apps/admin/', 'e2e/admin/'];
const WEB = ['apps/web/', 'e2e/web/', 'e2e/mock-server/', 'e2e/production/'];
// E2E와 무관(쉘은 mobile-e2e.yml, 문서는 workflow의 paths-ignore가 먼저 거름)
const NONE = ['apps/mobile-shell/', 'docs/', '.agents/', '.claude/', '.codex/'];

/** 바뀐 파일 목록 → 돌릴 앱 목록. 모르는 경로(공통 패키지·루트 설정 등)는 둘 다 */
export const selectE2eApps = (files) => {
  const apps = new Set();
  for (const file of files) {
    if (NONE.some((prefix) => file.startsWith(prefix)) || file.endsWith('.md')) continue;
    if (ADMIN.some((prefix) => file.startsWith(prefix))) apps.add('admin');
    else if (WEB.some((prefix) => file.startsWith(prefix))) apps.add('web');
    else return ['admin', 'web'];
  }
  return ['admin', 'web'].filter((app) => apps.has(app));
};

/** 앱 목록 → e2e job matrix. chromium은 고른 앱 전부, webkit은 web만(iOS WebView 엔진) */
export const toMatrix = (apps) => {
  const projects = apps.map((app) => `--project=${app}-chromium`);
  return [
    ...(projects.length
      ? [{ name: 'chromium', apps: apps.join(','), projects: projects.join(' ') }]
      : []),
    ...(apps.includes('web')
      ? [{ name: 'webkit', apps: 'web', projects: '--project=web-webkit' }]
      : []),
  ];
};

const check = () => {
  assert.deepEqual(selectE2eApps(['apps/admin/src/main.tsx']), ['admin']);
  assert.deepEqual(selectE2eApps(['apps/web/src/app/page.tsx', 'e2e/web/a.spec.ts']), ['web']);
  assert.deepEqual(selectE2eApps(['packages/design-system/src/index.ts']), ['admin', 'web']);
  assert.deepEqual(selectE2eApps(['yarn.lock']), ['admin', 'web']);
  assert.deepEqual(selectE2eApps(['apps/mobile-shell/app.json', 'docs/a.md']), []);
  assert.deepEqual(toMatrix(['admin']), [
    { name: 'chromium', apps: 'admin', projects: '--project=admin-chromium' },
  ]);
  assert.deepEqual(toMatrix([]), []);
  assert.equal(toMatrix(['admin', 'web']).length, 2);
};

const args = process.argv.slice(2);
if (args.includes('--check')) {
  check();
  console.log('select-e2e-apps: 규칙 점검 통과');
} else {
  const files = args.includes('--all')
    ? []
    : readFileSync(0, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
  const apps = args.includes('--all') ? ['admin', 'web'] : selectE2eApps(files);
  const matrix = JSON.stringify(toMatrix(apps));
  console.log(`E2E 대상: ${apps.join(', ') || '없음'}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\n`);
  else console.log(matrix);
}

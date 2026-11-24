import { expect, type Page, test } from '@playwright/test';

// Report-Only 위반도 securitypolicyviolation 이벤트가 생겨, 허용 출처 누락·eval 회귀(zod jitless)를 잡음
const collectViolations = async (page: Page) => {
  await page.addInitScript(() => {
    const store = window as unknown as { __cspViolations: string[] };
    store.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      store.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
};

test('응답에 보안 헤더가 붙고 iframe 삽입 차단은 강제된다', async ({ page }) => {
  const response = await page.goto('/feed');
  const headers = (await response?.allHeaders()) ?? {};

  expect(headers['content-security-policy']).toBe(
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  );
  expect(headers['content-security-policy-report-only']).toContain("default-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
});

for (const path of [
  '/feed',
  '/photos',
  '/bunch',
  '/bunches/1/bundles/1',
  '/my',
  '/invite/MOCK0001',
]) {
  test(`${path} 화면을 열어도 CSP 위반이 없다`, async ({ page }) => {
    await collectViolations(page);
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const violations = await page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
    );
    expect(violations).toEqual([]);
  });
}

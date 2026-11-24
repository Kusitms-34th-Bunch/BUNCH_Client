import { type Page, expect, test } from '@playwright/test';

// 운영 주소(E2E_BASE_URL)에서 로그인 없이 확인하는 스모크. 실서버 세션 확인(/api/session)과 접근 가드를 함께 거침
// 운영 데이터를 바꾸지 않는 읽기 동작만

// 앱 화면은 쉘 안에서만 열려서, 가드 연결은 쉘이 있다는 표시만 흉내 내 확인(bridge 응답은 오지 않음)
// e2e는 DOM 타입이 없어 브라우저 코드를 문자열로 넘김
const asAppShell = (page: Page) =>
  page.addInitScript({ content: 'window.ReactNativeWebView = { postMessage: () => {} }' });

test('브라우저로 연 앱 화면은 앱 설치 안내를 보여 준다', async ({ page }) => {
  await page.goto('/bunch');
  await expect(page.getByRole('heading', { level: 1, name: /휴대폰에서 모여요/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'iOS 앱 설치하기' })).toHaveAttribute(
    'href',
    /apps\.apple\.com/,
  );
  await expect(page).toHaveURL(/\/bunch$/);
});

test('앱에서 처음 온 비로그인 사용자는 번치 홈 대신 인트로로 간다', async ({ page }) => {
  await asAppShell(page);
  await page.goto('/bunch');
  await expect(page).toHaveURL(/\/intro$/);
  await expect(page.getByRole('button', { name: '다음 장면' })).toBeVisible();
});

test('인트로를 본 앱의 비로그인 사용자는 로그인 화면으로 가고 소셜 로그인 버튼이 보인다', async ({
  page,
}) => {
  await asAppShell(page);
  await page.addInitScript({ content: "localStorage.setItem('bunch:intro-seen', '1')" });
  await page.goto('/bunch');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: '카카오 로그인' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apple로 계속하기' })).toBeVisible();
});

test('없는 초대 링크도 서버 오류 없이 열린다', async ({ page }) => {
  const response = await page.goto('/invite/e2e-smoke-check');
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator('body')).not.toBeEmpty();
});

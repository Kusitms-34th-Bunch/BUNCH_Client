import { expect, test } from '@playwright/test';

// 운영 주소(E2E_BASE_URL)에서 로그인 없이 확인하는 스모크. 실서버 세션 확인(/api/session)과 접근 가드를 함께 거침
// 운영 데이터를 바꾸지 않는 읽기 동작만

test('처음 온 비로그인 사용자는 번치 홈 대신 인트로로 간다', async ({ page }) => {
  await page.goto('/bunch');
  await expect(page).toHaveURL(/\/intro$/);
  await expect(page.getByRole('button', { name: '다음 장면' })).toBeVisible();
});

test('인트로를 본 비로그인 사용자는 로그인 화면으로 가고 소셜 로그인 버튼이 보인다', async ({
  page,
}) => {
  // e2e는 DOM 타입이 없어 브라우저 코드를 문자열로 넘김
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

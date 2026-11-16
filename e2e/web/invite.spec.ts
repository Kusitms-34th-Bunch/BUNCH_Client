import { expect, test, type Locator } from '@playwright/test';

// MSW 시연 초대 「MOCKJOIN」(여행가조). 참여하면 가짜 DB에 번치가 새로 생김
const PENDING_INVITATION_KEY = 'bunch:pending-invitation';

// 초대 페이지는 접근 가드 밖이라 hydration 전에 그려지고 그 전 클릭은 무시됨. 결과가 보일 때까지 다시 누르되 상한을 둠
const clickUntil = async (button: Locator, done: () => Promise<void>) => {
  await expect(async () => {
    await button.click({ timeout: 5_000 });
    await done();
  }).toPass({ timeout: 30_000 });
};

test('초대 링크로 초대장을 확인하고 참여해 피드로 이동한다', async ({ page }) => {
  await page.goto('/invite/MOCKJOIN');
  await clickUntil(page.getByRole('button', { name: '초대장 확인하기' }), () =>
    expect(page).toHaveURL(/\/onboarding\/join\/invitation$/, { timeout: 2_000 }),
  );
  await expect(
    page.getByRole('heading', { level: 1, name: '초대받은 번치에 참여할까요?' }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: /여행가조/ })).toBeVisible();

  await page.getByRole('button', { name: '참여하기' }).click();
  await expect(page).toHaveURL(/\/onboarding\/join\/complete$/);

  await page.getByRole('button', { name: '번치로 이동하기' }).click();
  await expect(page).toHaveURL(/\/feed$/);
  // 참여를 마치면 보관한 초대를 지움
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), PENDING_INVITATION_KEY))
    .toBeNull();
});

test('없는 초대 링크는 안내 토스트를 띄우고 초대를 보관하지 않는다', async ({ page }) => {
  await page.goto('/invite/NOPE0000');
  await clickUntil(page.getByRole('button', { name: '초대장 확인하기' }), () =>
    expect(page.getByText('유효하지 않은 링크입니다.')).toBeVisible({ timeout: 2_000 }),
  );
  await expect(page).toHaveURL(/\/invite\/NOPE0000$/);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), PENDING_INVITATION_KEY))
    .toBeNull();
});

test.describe('앱 진입 시 보관된 초대와 기본 번치의 우선순위', () => {
  test('보관된 초대가 없으면 앱 진입과 로그인 화면은 번치 홈으로 보낸다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/bunch$/);
    await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();

    await page.goto('/login');
    await expect(page).toHaveURL(/\/bunch$/);
  });

  test('보관된 초대가 있으면 앱 진입이 초대 확인 화면으로 간다', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ invitation: 'MOCKJOIN', savedAt: Date.now() }));
    }, PENDING_INVITATION_KEY);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding\/join\/invitation$/);
    await expect(page.getByRole('article', { name: /여행가조/ })).toBeVisible();
  });

  test('24시간이 지난 초대는 버리고 번치 홈으로 간다', async ({ page }) => {
    // 보관 시각을 24시간 1분 전으로(만료 기준 PENDING_INVITATION_TTL_MS)
    await page.addInitScript((key) => {
      const savedAt = Date.now() - (24 * 60 + 1) * 60 * 1000;
      localStorage.setItem(key, JSON.stringify({ invitation: 'MOCKJOIN', savedAt }));
    }, PENDING_INVITATION_KEY);
    await page.goto('/');
    await expect(page).toHaveURL(/\/bunch$/);
    await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();
  });
});

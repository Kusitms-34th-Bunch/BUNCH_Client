import { expect, test } from '@playwright/test';

// 번치 프로필 편집은 관리자만 들어감(가짜 DB 시작 데이터: 여행쥬아, 비공개, 소개 「여행 안 갈 바엔 죽을란다」)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bunch:mock-session', 'owner'));
  await page.goto('/bunch');
  await page.getByRole('link', { name: '더보기' }).click();
  await page.getByRole('link', { name: '프로필 편집' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '번치 프로필 편집' })).toBeVisible();
});

test('이미 있는 번치 이름으로는 저장할 수 없다', async ({ page }) => {
  await page.getByRole('textbox', { name: '번치 이름' }).fill('퇴근런클럽');

  await expect(page.getByText('이미 사용 중인 번치 이름이에요')).toBeVisible();
  await expect(page.getByRole('button', { name: '저장하기' })).toBeDisabled();
});

test('이름·소개를 바꿔 저장하면 번치 홈에 새 이름이 보인다', async ({ page }) => {
  const save = page.getByRole('button', { name: '저장하기' });
  await expect(save).toBeDisabled();

  await page.getByRole('textbox', { name: '번치 이름' }).fill('여행쥬아들');
  await page.getByRole('textbox', { name: '한 줄 소개' }).fill('어디든 같이 가요');
  await save.click();

  await expect(page.getByText('번치 프로필을 수정했어요.')).toBeVisible();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('heading', { level: 1, name: '여행쥬아들' })).toBeVisible();
  await expect(page.getByText('어디든 같이 가요')).toBeVisible();
});

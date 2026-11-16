import { expect, test } from '@playwright/test';

test('마이페이지에서 닉네임을 바꿔 저장하면 돌아와 새 닉네임을 보여 준다', async ({ page }) => {
  await page.goto('/my');
  await page.getByRole('link', { name: /프로필 수정/ }).click();
  await expect(page).toHaveURL(/\/my\/profile$/);

  await page.getByRole('textbox', { name: '닉네임' }).fill('산책러');
  await page.getByRole('button', { name: '프로필 수정하기' }).click();

  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByText('프로필을 수정했어요.')).toBeVisible();
  await expect(page.getByRole('link', { name: '산책러 프로필 수정' })).toBeVisible();
});

test('이미 사용 중인 닉네임은 저장하지 않고 오류를 보여 준다', async ({ page }) => {
  // 가짜 서버는 「중복」이 들어간 닉네임을 사용 중으로 취급
  await page.goto('/my/profile');
  await page.getByRole('textbox', { name: '닉네임' }).fill('중복닉');

  await expect(page.getByText('이미 사용 중인 닉네임이에요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '프로필 수정하기' })).toBeDisabled();
  await expect(page).toHaveURL(/\/my\/profile$/);
});

import { expect, test } from '@playwright/test';

// MSW 가짜 서버 기준 핵심 흐름: 번치 탭 → 사진함 → 마이페이지 → 프로필 수정
test('하단 탭으로 번치·사진함·마이페이지를 오가고 프로필 수정에 들어간다', async ({ page }) => {
  await page.goto('/bunch');
  const tabs = page.getByRole('navigation', { name: '주요 메뉴' });

  await tabs.getByRole('link', { name: '사진함' }).click();
  await expect(page).toHaveURL(/\/photos$/);

  await tabs.getByRole('link', { name: '마이페이지' }).click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole('heading', { level: 1, name: 'MY' })).toBeVisible();

  await page.getByRole('link', { name: /프로필 수정/ }).click();
  await expect(page).toHaveURL(/\/my\/profile$/);
  await expect(page.getByRole('heading', { level: 1, name: '개인 프로필 수정' })).toBeAttached();
});

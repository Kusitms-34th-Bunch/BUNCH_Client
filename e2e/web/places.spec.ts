import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 콕한 장소 7곳(은우 3곳)
test('멤버 필터로 그 멤버가 콕한 장소만 보이고, 콕에서 빼면 목록과 수가 줄어든다', async ({
  page,
}) => {
  await page.goto('/bunch/places');
  const items = page.getByRole('main').getByRole('listitem');
  await expect(items).toHaveCount(7);

  await page.getByRole('radio', { name: '은우 3' }).click();
  await expect(items).toHaveCount(3);

  await page.getByRole('radio', { name: '전체 7' }).click();
  await page.getByRole('button', { name: '봄날카페 더보기' }).click();
  await page
    .getByRole('dialog', { name: '봄날카페 장소 더보기' })
    .getByRole('button', { name: '콕에서 빼기' })
    .click();

  await expect(page.getByRole('radio', { name: '전체 6' })).toBeVisible();
  await expect(items).toHaveCount(6);
  await expect(page.getByRole('button', { name: '봄날카페 더보기' })).toHaveCount(0);
});

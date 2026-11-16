import { expect, test } from '@playwright/test';

// 좋아요·댓글이 0인 캠핑러버 번들(가짜 DB 시작 데이터)
const BUNDLE = '캠핑러버의 번들 여름밤 바닷가 캠핑';

test('피드 번들 상세에서 좋아요·댓글을 남기고 돌아오면 카드에 반영된다', async ({ page }) => {
  await page.goto('/feed');
  const card = page.getByRole('article', { name: BUNDLE });
  await expect(card.getByRole('button', { name: '좋아요 0' })).toBeVisible();

  await card.getByRole('button', { name: /사진 열기$/ }).click();
  await expect(page).toHaveURL(/\/bunches\/\d+\/bundles\/\d+/);
  // 전환 동안 남아 있는 피드 화면의 같은 이름 버튼과 겹치지 않게 피드가 빠진 뒤 진행
  await expect(card).toBeHidden();

  await page.getByRole('button', { name: '좋아요 0' }).click();
  await expect(page.getByRole('button', { name: '좋아요 1' })).toBeVisible();

  await page.getByRole('textbox', { name: '여행쥬아로 댓글 달기' }).fill('다음엔 같이 가요');
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(
    page.getByRole('region', { name: '댓글' }).getByText('다음엔 같이 가요'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '댓글 1' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(card.getByRole('button', { name: '좋아요 1' })).toBeVisible();
  await expect(card.getByRole('button', { name: '댓글 1' })).toBeVisible();
});

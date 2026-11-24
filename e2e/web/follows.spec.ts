import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 팔로워 3(주말등산·캠핑러버·산책클럽), 팔로잉 2, 받은 팔로우 요청 3
test('나를 팔로우한 번치를 맞팔로우하면 버튼과 팔로잉 수가 바뀐다', async ({ page }) => {
  await page.goto('/bunch/follows');
  await expect(page.getByRole('tab', { name: '팔로잉 2' })).toBeVisible();

  await page.getByRole('button', { name: '캠핑러버 팔로우' }).click();

  await expect(
    page.getByRole('button', { name: '캠핑러버 팔로잉, 누르면 팔로우 취소' }),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: '팔로잉 3' })).toBeVisible();
});

test('팔로우 요청을 승인하면 팔로워가 늘고, 거절하면 목록에서만 빠진다', async ({ page }) => {
  await page.goto('/bunch/follows');
  await page.getByRole('button', { name: '팔로우 요청 3' }).click();
  await expect(page).toHaveURL(/\/bunch\/follows\/requests$/);
  await expect(page.getByText('대기 중인 요청 3개')).toBeVisible();

  await page.getByRole('button', { name: '맛집탐방대 팔로우 요청 승인' }).click();
  await expect(page.getByText('대기 중인 요청 2개')).toBeVisible();
  await expect(page.getByRole('button', { name: /^맛집탐방대 팔로우 요청/ })).toHaveCount(0);

  await page.getByRole('button', { name: '서핑크루 팔로우 요청 거절' }).click();
  await expect(page.getByText('대기 중인 요청 1개')).toBeVisible();

  // 새로고침하면 가짜 DB 저장(300ms 늦춤)이 끝나기 전이라 이전 상태로 돌아갈 수 있어 앱 안에서 돌아감
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL(/\/bunch\/follows$/);
  await expect(page.getByRole('tab', { name: '팔로워 4' })).toBeVisible();
  await expect(page.getByRole('button', { name: '팔로우 요청 1' })).toBeVisible();
});

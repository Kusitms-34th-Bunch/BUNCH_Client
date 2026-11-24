import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 알림 4개(읽지 않음 3, 지운 번들을 가리키는 읽은 알림 1)
const NEW_BUNDLE = /^새 번들이 올라왔어요/;

test('읽지 않은 알림을 열면 그 번들로 가고, 모두 읽으면 헤더의 읽지 않음 표시가 사라진다', async ({
  page,
}) => {
  await page.goto('/bunch');
  await page.getByRole('link', { name: '알림, 읽지 않은 알림 있음' }).click();
  await expect(page).toHaveURL(/\/bunch\/notifications$/);
  await expect(page.getByRole('heading', { name: '여행쥬아 알림', level: 1 })).toBeVisible();

  const item = page.getByRole('button', { name: NEW_BUNDLE });
  await expect(item).toHaveAccessibleName(/읽지 않음/);
  await item.click();
  await expect(page).toHaveURL(/\/bunches\/1\/bundles\/1$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/bunch\/notifications$/);
  // 돌아오는 전환 동안 알림 화면이 두 겹이라 한 겹이 된 뒤 확인
  await expect(item).toHaveCount(1);
  // 연 알림은 읽음으로 바뀌고 나머지는 그대로
  await expect(item).not.toHaveAccessibleName(/읽지 않음/);
  await expect(page.getByRole('button', { name: /읽지 않음/ })).toHaveCount(2);

  const readAll = page.getByRole('button', { name: '모두 읽음' });
  await readAll.click();
  await expect(page.getByText('모든 알림을 읽음으로 바꿨어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: /읽지 않음/ })).toHaveCount(0);
  await expect(readAll).toBeDisabled();

  // 새로고침하면 가짜 DB 저장(300ms 늦춤)이 끝나기 전이라 이전 상태로 돌아갈 수 있어 앱 안에서 돌아감
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('link', { name: '알림', exact: true })).toBeVisible();
});

test('지운 번들을 가리키는 알림은 볼 수 없다는 화면으로 간다', async ({ page }) => {
  await page.goto('/bunch/notifications');
  await page.getByRole('button', { name: /^번들에 좋아요가 달렸어요/ }).click();

  await expect(page).toHaveURL(/\/bunches\/1\/bundles\/9999$/);
  await expect(
    page.getByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요', level: 1 }),
  ).toBeVisible();
});

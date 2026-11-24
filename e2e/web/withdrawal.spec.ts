import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 나(큐시즘)는 관리자인 번치가 없어 바로 탈퇴할 수 있음
test('안내를 확인하고 탈퇴하면 로그인 화면으로 가고 보호된 화면에 다시 들어가지 못한다', async ({
  page,
}) => {
  await page.goto('/my');
  await page.getByRole('link', { name: /탈퇴하기/ }).click();
  await expect(page).toHaveURL(/\/my\/withdrawal$/);

  const next = page.getByRole('button', { name: '다음' });
  await expect(next).toBeDisabled();
  await page.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' }).check();
  await next.click();

  const dialog = page.getByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
  await dialog.getByRole('button', { name: '탈퇴하기' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /카카오/ })).toBeVisible();

  // 세션이 끝나 보호된 화면은 인트로·로그인으로 보냄
  await page.goto('/bunch');
  await expect(page).toHaveURL(/\/(intro|login)$/);
});

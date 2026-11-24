import { expect, type Page, test } from '@playwright/test';

// 관리자 전용 메뉴라 여행쥬아 관리자 세션으로 시작(가짜 DB 시작 데이터의 발행 번들 「강릉 커피 투어 ☕」·「망원 한강 피크닉 🧺」)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bunch:mock-session', 'owner'));
});

const openMenu = async (page: Page, bundleId: number, title: string) => {
  // 삭제·저장 뒤 기록을 되돌아가므로 실제처럼 번치 홈에서 번들로 들어감
  await page.goto('/bunch');
  // 비공개 번치의 발행 번들은 처음에 모두 멤버 공개
  await expect(page.getByRole('link', { name: `${title}, 멤버 공개` })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(`^${title}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/bunches/1/bundles/${bundleId}$`));
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.getByRole('button', { name: '번들 더보기' }).click();
};

test('발행한 번들의 제목을 고쳐 저장하면 상세에 새 제목이 보인다', async ({ page }) => {
  await openMenu(page, 1, '강릉 커피 투어 ☕');
  await page.getByRole('button', { name: '수정하기' }).click();
  await expect(page).toHaveURL(/\/bunches\/1\/bundles\/1\/edit$/);

  const title = page.getByRole('textbox', { name: '번들 제목' });
  await title.fill('강릉 바다 커피 투어');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page
    .getByRole('alertdialog', { name: '수정한 내용을 저장할까요?' })
    .getByRole('button', { name: '저장' })
    .click();

  await expect(page.getByText('번들을 수정했어요')).toBeVisible();
  await expect(page).toHaveURL(/\/bunches\/1\/bundles\/1$/);
  await expect(page.getByRole('heading', { level: 1, name: '강릉 바다 커피 투어' })).toBeVisible();
});

test('비공개 번치 번들을 일부 공개로 바꾸면 번치 홈 번들 칸의 멤버 공개 표시가 빠진다', async ({
  page,
}) => {
  await openMenu(page, 1, '강릉 커피 투어 ☕');
  await page.getByRole('button', { name: '공개 범위 설정' }).click();
  const options = page.getByRole('radiogroup', { name: '번들의 공개 범위를 설정해 주세요' });
  // 비공개 번치라 전체 공개는 없음
  await expect(options.getByRole('radio')).toHaveCount(2);
  await expect(options.getByRole('radio', { name: '멤버 공개' })).toBeChecked();

  const submit = page.getByRole('button', { name: '수정하기' });
  await expect(submit).toBeDisabled();
  await options.getByRole('radio', { name: '일부 공개' }).check();
  await submit.click();

  await expect(page.getByText('공개 범위를 수정했어요.')).toBeVisible();
  await expect(page).toHaveURL(/\/bunches\/1\/bundles\/1$/);
  // 새로고침하면 가짜 DB 저장(300ms 늦춤)이 끝나기 전이라 이전 상태로 돌아갈 수 있어 앱 안에서 돌아감
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('link', { name: '강릉 커피 투어 ☕', exact: true })).toBeVisible();
});

test('번들을 삭제하면 번치 홈에서 빠지고 다른 번들은 남는다', async ({ page }) => {
  await openMenu(page, 2, '망원 한강 피크닉 🧺');
  await page.getByRole('button', { name: '삭제하기' }).click();
  await page
    .getByRole('alertdialog', { name: '게시글을 삭제할까요?' })
    .getByRole('button', { name: '삭제' })
    .click();

  await expect(page.getByText('번들을 삭제했어요')).toBeVisible();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('link', { name: /^망원 한강 피크닉/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^강릉 커피 투어/ })).toBeVisible();
});

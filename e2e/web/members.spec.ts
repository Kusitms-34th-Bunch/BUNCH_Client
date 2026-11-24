import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 멤버 5명
test('관리자가 아니면 멤버 관리 버튼이 없다', async ({ page }) => {
  await page.goto('/bunch/members');
  await expect(page.getByText('멤버 5/8명')).toBeVisible();
  await expect(page.getByRole('button', { name: /관리$/ })).toHaveCount(0);
});

test.describe('여행쥬아 관리자', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bunch:mock-session', 'owner'));
    await page.goto('/bunch/members');
    await expect(page.getByText('멤버 5/8명')).toBeVisible();
  });

  test('멤버를 번치에서 내보내면 목록과 멤버 수에서 빠진다', async ({ page }) => {
    await page.getByRole('button', { name: '경진 관리' }).click();
    await page
      .getByRole('alertdialog', { name: '경진' })
      .getByRole('button', { name: '번치에서 내보내기' })
      .click();
    await page.getByRole('button', { name: '내보내기', exact: true }).click();

    await expect(page.getByText('멤버 4/8명')).toBeVisible();
    await expect(page.getByRole('button', { name: '경진 관리' })).toHaveCount(0);
  });

  test('멤버를 공동 관리자로 지정하면 역할이 바뀐다', async ({ page }) => {
    await page.getByRole('button', { name: '수인 관리' }).click();
    const menu = page.getByRole('alertdialog', { name: '수인' });
    await expect(menu.getByText('일반 멤버', { exact: true })).toBeVisible();
    await menu.getByRole('button', { name: '공동 관리자로 지정하기' }).click();
    await expect(
      page.getByRole('heading', { name: '수인님을 공동 관리자로 지정할까요?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '완료' }).click();
    await expect(
      page.getByRole('heading', { name: '수인님을 공동 관리자로 지정할까요?' }),
    ).toBeHidden();

    await page.getByRole('button', { name: '수인 관리' }).click();
    await expect(
      page.getByRole('alertdialog', { name: '수인' }).getByText('공동 관리자', { exact: true }),
    ).toBeVisible();
  });
});

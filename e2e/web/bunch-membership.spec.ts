import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 나(큐시즘)는 여행쥬아·퇴근런클럽의 멤버(관리자 아님)
test('멤버가 번치를 나가면 남은 번치 홈으로 가고 전환 목록에서 빠진다', async ({ page }) => {
  // 나간 뒤 기록을 되돌아가므로 실제처럼 번치 홈에서 메뉴로 들어감
  await page.goto('/bunch');
  await page.getByRole('link', { name: '더보기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '여행쥬아 번치 더보기' })).toBeVisible();

  await page.getByRole('button', { name: '번치 나가기' }).click();
  await expect(page.getByRole('heading', { name: '여행쥬아 번치를 나갈까요?' })).toBeVisible();
  await page.getByRole('button', { name: '나가기', exact: true }).click();

  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByText('여행쥬아 번치를 나왔어요.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '퇴근런클럽' })).toBeVisible();

  await page.getByRole('banner').getByRole('button', { name: '퇴근런클럽' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: /퇴근런클럽/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /여행쥬아/ })).toHaveCount(0);
});

test.describe('여행쥬아 관리자', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bunch:mock-session', 'owner'));
    await page.goto('/bunch');
    await page.getByRole('link', { name: '더보기' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: '여행쥬아 번치 더보기' }),
    ).toBeVisible();
  });

  test('관리자는 새 관리자를 정해야 나갈 수 있고, 정하면 넘기고 나온다', async ({ page }) => {
    await page.getByRole('button', { name: '번치 나가기' }).click();
    await expect(page).toHaveURL(/\/bunch\/menu\/leave$/);

    await expect(
      page.getByRole('heading', { level: 1, name: '관리자 권한을 넘길 멤버를 정해주세요.' }),
    ).toBeVisible();
    const assign = page.getByRole('button', { name: '관리자로 지정하기' });
    await expect(assign).toBeDisabled();
    await page.getByRole('radio', { name: '경진' }).check();
    await assign.click();
    await expect(
      page.getByRole('heading', { name: '경진님을 관리자로 지정하고 나갈까요?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '나가기', exact: true }).click();

    await expect(page.getByText('경진님을 관리자로 지정하고 나왔어요.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: '퇴근런클럽' })).toBeVisible();
  });

  test('확인 문구(삭제하기)를 입력해야 삭제되고, 삭제하면 남은 번치 홈으로 간다', async ({
    page,
  }) => {
    await page.getByRole('link', { name: '번치 삭제' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: '여행쥬아를 삭제할까요?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.getByText('삭제할 번치 정보')).toBeVisible();

    const remove = page.getByRole('button', { name: '삭제하기' });
    await expect(remove).toBeDisabled();
    await page.getByRole('textbox', { name: '확인 문구 입력' }).fill('삭제하기');
    await remove.click();

    await expect(page.getByText('여행쥬아 번치를 삭제했어요.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: '퇴근런클럽' })).toBeVisible();
  });
});

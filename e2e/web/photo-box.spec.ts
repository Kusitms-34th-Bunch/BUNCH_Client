import { expect, type Page, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 사진 13장 중 내(큐시즘) 사진은 10/18·10/17 한 장씩
const selectFirstPhotoOf = async (page: Page, member: string, day: string) => {
  await page.goto('/photos');
  await page.getByRole('radio', { name: member }).click();
  await page.getByRole('button', { name: '선택', exact: true }).click();
  const photos = page.getByRole('region', { name: day }).getByRole('button');
  const count = await photos.count();
  await photos.first().click();
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('menuitem', { name: '삭제' }).click();
  return { photos, count };
};

test('내가 올린 사진을 골라 삭제하면 목록에서 빠지고 선택 모드가 끝난다', async ({ page }) => {
  await selectFirstPhotoOf(page, '큐시즘', '10월 17일 토요일');

  const dialog = page.getByRole('alertdialog', { name: '이 사진을 삭제할까요?' });
  await dialog.getByRole('button', { name: '삭제' }).click();

  await expect(page.getByText('사진함에서 사진 1장이 삭제되었어요.')).toBeVisible();
  await expect(page.getByRole('region', { name: '10월 17일 토요일' })).toBeHidden();
  await expect(page.getByRole('region', { name: '10월 18일 일요일' })).toBeVisible();
  await expect(page.getByRole('button', { name: '선택', exact: true })).toBeVisible();
});

test('다른 멤버의 사진은 관리자가 아니면 삭제하지 못하고 그대로 남는다', async ({ page }) => {
  const { photos, count } = await selectFirstPhotoOf(page, '지예', '10월 18일 일요일');

  await expect(page.getByText('내가 올린 사진만 삭제할 수 있어요.')).toBeVisible();
  expect(count).toBeGreaterThan(0);
  await expect(photos).toHaveCount(count);
});

test('브라우저에서는 사진을 올릴 수 없고 앱에서 하라고 안내한다', async ({ page }) => {
  await page.goto('/photos');
  await page.getByRole('button', { name: '사진 올리기' }).click();
  await page.getByRole('button', { name: /앨범에서 선택/ }).click();

  await expect(page.getByText('사진 올리기는 앱에서 할 수 있어요.')).toBeVisible();
});

test('사진을 누르면 사진함 위에 상세가 뜨고, 뒤로 가면 사진함이 그대로 남아 있다(#598)', async ({
  page,
}) => {
  await page.goto('/photos');
  const day = page.getByRole('region', { name: '10월 18일 일요일' });
  const firstPhoto = day.getByRole('link').first();
  const name = await firstPhoto.getAttribute('aria-label');
  await firstPhoto.click();

  await expect(page).toHaveURL(/\/photos\/\d+$/);
  await expect(page.getByRole('heading', { name: '사진 상세' })).toBeVisible();
  // 뒤 사진함은 남아 있지만 상세가 떠 있는 동안 보조기술·누름에서 빠짐(inert)
  await expect(page.locator('[data-overlay-under]')).toHaveAttribute('inert', '');

  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL(/\/photos$/);
  await expect(page.getByRole('heading', { name: '사진 상세' })).toBeHidden();
  await expect(page.locator('[data-overlay-under]')).not.toHaveAttribute('inert');
  await expect(day.getByRole('link', { name: name ?? '' }).first()).toBeVisible();
});

test('사진 상세 주소로 바로 열면 겹치지 않은 상세 화면이 뜬다', async ({ page }) => {
  await page.goto('/photos/1');
  await expect(page.getByRole('heading', { name: '사진 상세' })).toBeVisible();
  await expect(page.locator('[data-screen-overlay]')).toHaveCount(0);
});

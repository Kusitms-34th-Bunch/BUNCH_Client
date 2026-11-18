import { expect, test, type Page } from '@playwright/test';

// 가짜 서버의 시작 세션(apps/web/src/mocks/db/seed.ts `createSeedFor`). 첫 문서보다 먼저 넣어야 시작 데이터에 반영됨
const startAs = (page: Page, session: 'anonymous' | 'signup-terms') =>
  page.addInitScript((value) => localStorage.setItem('bunch:mock-session', value), session);

test.describe('가입 중(약관 전) 세션', () => {
  test.beforeEach(({ page }) => startAs(page, 'signup-terms'));

  test('약관에 동의하고 프로필을 만들면 번치 시작으로 간다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/signup\/terms$/);

    // 체크 상자는 화면에서 숨기고 라벨이 눌림을 받음
    await page.getByText('전체 동의하기').click();
    await expect(page.getByRole('checkbox', { name: '전체 동의하기' })).toBeChecked();
    await page.getByRole('button', { name: '시작하기' }).click();
    await expect(page).toHaveURL(/\/signup\/profile$/);

    await page.getByRole('textbox', { name: '닉네임' }).fill('새싹');
    await page.getByRole('button', { name: 'BUNCH 시작하기' }).click();
    // 시작 데이터에 소속 번치가 없어 번치 시작 선택으로
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test('약관 동의 전에는 프로필 화면에 들어가지 못한다', async ({ page }) => {
    await page.goto('/signup/profile');
    await expect(page).toHaveURL(/\/signup\/terms$/);
  });
});

test.describe('비로그인 세션', () => {
  test.beforeEach(({ page }) => startAs(page, 'anonymous'));

  test('처음이면 보호된 화면 대신 인트로를 보여 준다', async ({ page }) => {
    await page.goto('/bunch');
    await expect(page).toHaveURL(/\/intro$/);
  });

  test('인트로를 봤으면 로그인 화면과 소셜 로그인 버튼 3개를 보여 준다', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bunch:intro-seen', '1'));
    await page.goto('/bunch');
    await expect(page).toHaveURL(/\/login$/);
    for (const name of ['카카오 로그인', 'Google로 계속하기', 'Apple로 계속하기']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });
});

test('마이페이지에서 로그아웃하면 로그인 화면으로 간다', async ({ page }) => {
  await page.goto('/my');
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page
    .getByRole('alertdialog', { name: '로그아웃할까요?' })
    .getByRole('button', { name: '로그아웃' })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: '카카오 로그인' })).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('번치 만들기 중간 단계로 바로 들어가면 첫 단계로 돌아간다', async ({ page }) => {
  await page.goto('/onboarding/create/mood');
  await expect(page).toHaveURL(/\/onboarding\/create$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '어떤 번치를 만들까요?' }),
  ).toBeVisible();
});

test('이름·공개 범위 → 소개 → 분위기를 거쳐 번치를 만들고 새 번치 홈으로 이동한다', async ({
  page,
}) => {
  await page.goto('/onboarding/create');
  // 이름 안의 공백은 쓸 수 있음(기능명세 2.2.2)
  await page.getByRole('textbox', { name: '번치 이름' }).fill('주말 산책회');
  await page
    .getByRole('radio', { name: /공개 번치/ })
    .first()
    .check();
  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL(/\/onboarding\/create\/description$/);
  await page.getByRole('textbox', { name: '한 줄 소개' }).fill('주말마다 동네를 걷는 모임');
  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL(/\/onboarding\/create\/mood$/);
  // 라디오는 화면에서 숨기고 라벨(그림·글자)이 눌림을 받음
  await page.getByText('활발한 모임').click();
  await expect(page.getByRole('radio', { name: '활발한 모임' })).toBeChecked();
  await page.getByRole('button', { name: '번치 만들기' }).click();

  await expect(page).toHaveURL(/\/onboarding\/create\/complete$/);
  await expect(page.getByRole('heading', { level: 1, name: /주말 산책회/ })).toBeVisible();

  // 새로 만든 번치의 홈으로 감(기능명세 2.3.4). 만든 번치가 기본 번치라 번치 탭이 그 번치를 보임
  await page.getByRole('button', { name: '내 번치로 이동하기' }).click();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('heading', { level: 1, name: /주말 산책회/ })).toBeVisible();
});

test('번치 홈에서 다른 번치로 전환하면 홈과 피드가 그 번치로 바뀐다', async ({ page }) => {
  await page.goto('/bunch');
  await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();

  await page.getByRole('banner').getByRole('button', { name: '여행쥬아' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: /퇴근런클럽/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: '퇴근런클럽' })).toBeVisible();
  await expect(page.getByText('퇴근런클럽 번치로 전환했어요.')).toBeVisible();

  await page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('link', { name: '피드' })
    .click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('link', { name: '퇴근런클럽 번치 홈' })).toBeVisible();
});

test('이미 있는 번치 이름으로는 다음 단계로 가지 못한다', async ({ page }) => {
  await page.goto('/onboarding/create');
  const name = page.getByRole('textbox', { name: '번치 이름' });
  await name.fill('퇴근런클럽');

  await expect(page.getByText('이미 사용 중인 번치 이름이에요')).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
});

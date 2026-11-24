import { expect, test } from '@playwright/test';
import { fillOtherParticipantComments } from '../fixtures/mockDb';

test('멤버·사진을 골라 제목·위치·날짜·코멘트를 채우고 올리면 번치 홈에 새 번들이 보인다', async ({
  page,
}) => {
  await page.goto('/bunch');
  await page.getByRole('button', { name: '번들 만들기' }).click();
  await expect(page).toHaveURL(/\/bunch\/bundles\/new\/members$/);
  await expect(page.getByText('누구와 함께 만들까요?')).toBeVisible();
  await page
    .getByRole('button', { name: /추가하기/ })
    .first()
    .click();
  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL(/\/bunch\/bundles\/new$/);
  // 전환 동안 멤버 선택 화면의 「다음」이 함께 있어 그 화면이 빠진 뒤 진행
  await expect(page.getByText('누구와 함께 만들까요?')).toBeHidden();
  await page.getByRole('button', { name: '2026-10-18에 찍은 사진' }).first().click();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page).toHaveURL(/\/bunch\/drafts\/\d+/);
  const bundleId = Number(/\/drafts\/(\d+)/.exec(page.url())![1]);

  const upload = page.getByRole('button', { name: '업로드' });
  await expect(upload).toBeDisabled();

  await page.getByRole('textbox', { name: '번들 제목' }).fill('설악 단풍 산책');
  await page.getByRole('button', { name: '위치: 위치 추가' }).click();
  await page.getByRole('searchbox', { name: '장소나 주소 검색' }).fill('여의도');
  await page
    .getByRole('button', { name: /여의도한강공원/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /^위치: 여의도한강공원/ })).toBeVisible();
  await page.getByRole('button', { name: '10월 18일' }).click();
  await expect(page.getByRole('button', { name: /^날짜: 10월 18일/ })).toBeVisible();

  const mine = '단풍이 제일 예뻤던 날';
  await page.getByRole('textbox', { name: '큐시즘 (나) 코멘트' }).fill(mine);
  await expect(page.getByRole('status').filter({ hasText: '저장 완료' })).toBeVisible();
  // 다른 참여자 코멘트가 없어 아직 올릴 수 없음
  await expect(upload).toBeDisabled();

  await fillOtherParticipantComments(page, { bundleId, mine, others: '또 가자' });
  await expect(upload).toBeEnabled();
  await upload.click();

  await expect(
    page.getByRole('heading', { level: 1, name: '번들의 공개 범위를 설정해 주세요' }),
  ).toBeVisible();
  // 전환 동안 작성 화면의 「업로드」가 함께 있어 그 화면이 빠진 뒤 진행
  await expect(page.getByRole('textbox', { name: '번들 제목' })).toBeHidden();
  const publish = page.getByRole('button', { name: '업로드' });
  await expect(publish).toBeDisabled();
  await page.getByRole('radio', { name: '일부 공개' }).check();
  await publish.click();

  await expect(page.getByText('번들을 업로드했어요.')).toBeVisible();
  await expect(page).toHaveURL(/\/bunch$/);
  await expect(page.getByRole('link', { name: '설악 단풍 산책', exact: true })).toBeVisible();
});

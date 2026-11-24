import { expect, test } from '@playwright/test';

// 가짜 DB 시작 데이터: 여행쥬아 발행 번들 「강릉 커피 투어 ☕」는 댓글 0, 피드의 캠핑러버 「가평 첫 캠핑 🏕️」은 다른 사람 댓글 4
test('내 댓글에 답글을 달고, 답글이 있는 댓글을 삭제하면 「삭제된 댓글」로 남고 답글은 그대로다', async ({
  page,
}) => {
  await page.goto('/bunches/1/bundles/1');
  await page.getByRole('textbox', { name: '여행쥬아로 댓글 달기' }).fill('첫 댓글');
  await page.getByRole('button', { name: '보내기' }).click();
  const comment = page.getByRole('listitem', { name: '큐시즘님의 댓글' });
  await expect(comment).toBeVisible();
  await expect(page.getByRole('button', { name: '댓글 1' })).toBeVisible();

  await comment.getByRole('button', { name: '큐시즘님 댓글에 답글 달기' }).click();
  await page.getByRole('textbox', { name: /답글/ }).fill('답글이에요');
  await page.getByRole('button', { name: '보내기' }).click();
  // 일반 댓글로 잘못 등록돼도 글자는 보이므로 답글 항목 이름으로 구분
  await expect(page.getByRole('listitem', { name: '큐시즘님의 답글' })).toContainText('답글이에요');
  await expect(page.getByRole('button', { name: '댓글 2' })).toBeVisible();

  await page.getByRole('button', { name: '내 댓글 더보기: 첫 댓글' }).click();
  await page
    .getByRole('dialog', { name: '댓글 더보기' })
    .getByRole('button', { name: '삭제' })
    .click();
  await page
    .getByRole('alertdialog', { name: '댓글을 삭제할까요?' })
    .getByRole('button', { name: '삭제' })
    .click();

  await expect(page.getByText('댓글을 삭제했어요')).toBeVisible();
  await expect(page.getByRole('region', { name: '댓글' }).getByText('첫 댓글')).toHaveCount(0);
  await expect(page.getByRole('listitem', { name: '삭제된 댓글' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: '큐시즘님의 답글' })).toContainText('답글이에요');
});

test('다른 번치 사람의 댓글을 신고하면 접수 안내가 뜬다', async ({ page }) => {
  await page.goto('/feed');
  const card = page.getByRole('article', { name: '캠핑러버의 번들 가평 첫 캠핑 🏕️' });
  await card.getByRole('button', { name: /사진 열기$/ }).click();
  await expect(page).toHaveURL(/\/bunches\/\d+\/bundles\/\d+/);
  await expect(card).toBeHidden();

  await page
    .getByRole('region', { name: '댓글' })
    .getByRole('button', { name: /^(?!내 ).*댓글 더보기/ })
    .first()
    .click();
  await page
    .getByRole('dialog', { name: '댓글 더보기' })
    .getByRole('button', { name: '신고' })
    .click();

  const report = page.getByRole('dialog', { name: '이 댓글을 신고할까요?' });
  const submit = report.getByRole('button', { name: '신고하기' });
  await expect(submit).toBeDisabled();
  await report.getByRole('radio', { name: '스팸' }).check();
  await submit.click();

  await expect(page.getByText('신고가 접수됐어요.')).toBeVisible();
  await expect(report).toBeHidden();
});

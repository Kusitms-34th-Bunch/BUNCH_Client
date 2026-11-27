import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// 화면을 처음 불러오지 못했을 때의 안내(PageErrorState)와 다시 시도(#601)
// 가짜 서버가 sessionStorage의 실패 목록에 맞는 요청을 500으로 돌려줌(apps/web/src/mocks/lib/failOverride.ts)
const MOCK_FAIL_KEY = 'bunch-mock-fail';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const ERROR_TEXT = '일시적인 오류가 발생했어요. 다시 시도해 주세요';

// 문서를 새로 열 때마다 실패 목록을 넣음(같은 문서에서 지우면 다시 시도가 성공)
const failRequests = async (page: Page, rules: string[]) => {
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
    MOCK_FAIL_KEY,
    JSON.stringify(rules),
  ] as const);
};
const recover = (page: Page) =>
  page.evaluate((key) => sessionStorage.removeItem(key), MOCK_FAIL_KEY);

const SCREENS = [
  {
    name: '사진함',
    path: '/photos',
    fail: 'GET ^/api/bunches/\\d+/photos$',
    // 회복하면 날짜별 묶음 제목으로 목록이 그려짐
    ready: (page: Page) => page.getByRole('heading', { level: 2 }).first(),
  },
  {
    name: '번치 홈',
    path: '/bunch',
    fail: 'GET ^/api/bunches/\\d+/home$',
    ready: (page: Page) => page.getByRole('heading', { level: 1, name: '여행쥬아' }),
  },
];

for (const screen of SCREENS) {
  test(`${screen.name}을 불러오지 못하면 오류 안내와 다시 시도가 보이고, 다시 시도하면 회복한다`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await failRequests(page, [screen.fail]);
    await page.goto(screen.path);

    const alert = page.getByRole('alert').filter({ hasText: ERROR_TEXT });
    await expect(alert).toBeVisible();
    const retry = page.getByRole('button', { name: '다시 시도' });
    await expect(retry).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([]);

    await recover(page);
    await retry.click();
    await expect(screen.ready(page)).toBeVisible();
    await expect(alert).toBeHidden();
  });
}

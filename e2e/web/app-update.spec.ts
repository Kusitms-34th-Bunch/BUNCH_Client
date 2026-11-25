import { expect, test, type Page } from '@playwright/test';

// 쉘이 있다는 표시만 흉내 냄. `getAppVersion`을 알리지 않아 버전을 모르는 이전 쉘로 보임
const asLegacyShell = (page: Page) =>
  page.addInitScript(() => {
    Object.assign(globalThis, { ReactNativeWebView: { postMessage: () => {} } });
  });

test.describe('앱 업데이트 확인', () => {
  test('업데이트가 필요하면 닫을 수 없는 모달이 뜨고 버튼은 App Store로 간다', async ({
    browserName,
    context,
    page,
  }) => {
    // 가짜 서버의 서비스 워커를 거쳐 나가는 요청이라 page가 아닌 context에서 가로챔(WebKit은 가로채지 못함)
    test.skip(browserName === 'webkit', '서비스 워커를 거친 요청을 가로챌 수 없음');
    await asLegacyShell(page);
    const asked: string[] = [];
    await context.route('**/api/app-version?*', (route) => {
      asked.push(new URL(route.request().url()).search);
      return route.fulfill({ json: { updateRequired: true } });
    });
    // App Store로 나가는 이동은 막고 주소만 확인
    const store = page.waitForRequest((request) =>
      request.url().startsWith('https://apps.apple.com/'),
    );
    await page.route('https://apps.apple.com/**', (route) => route.abort());

    await page.goto('/intro');
    const dialog = page.getByRole('alertdialog', { name: '업데이트가 필요해요' });
    await expect(dialog).toBeVisible();
    expect(asked).toEqual(['?version=legacy']);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: '업데이트' }).click();
    expect((await store).url()).toBe('https://apps.apple.com/app/id6834488511');
  });

  test('지금 정책은 이전 쉘을 막지 않는다', async ({ page }) => {
    await asLegacyShell(page);
    const response = page.waitForResponse('**/api/app-version?*');
    await page.goto('/intro');
    expect(await (await response).json()).toEqual({ updateRequired: false });
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
});

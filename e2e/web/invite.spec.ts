import { expect, test, type Locator, type Page } from '@playwright/test';

// MSW 시연 초대 「MOCKJOIN」(여행가조). 참여하면 가짜 DB에 번치가 새로 생김
const PENDING_INVITATION_KEY = 'bunch:pending-invitation';

// 초대 페이지는 접근 가드 밖이라 hydration 전에 그려지고 그 전 클릭은 무시됨. 결과가 보일 때까지 다시 누르되 상한을 둠
const clickUntil = async (button: Locator, done: () => Promise<void>) => {
  await expect(async () => {
    await button.click({ timeout: 5_000 });
    await done();
  }).toPass({ timeout: 30_000 });
};

// 유니버셜 링크로 앱이 열려 쉘 WebView가 이 주소를 연 경우: 쉘이 있다는 표시만 흉내 냄(bridge 응답은 오지 않음)
// 탭 전환 같은 응답을 기다리는 동작은 멈추므로, 쉘 흉내 테스트는 초대 확인 화면까지만 봄
const asAppShell = (page: Page) =>
  page.addInitScript(() => {
    // 브라우저에서 실행되는 함수라 window와 같은 globalThis에 넣음(E2E 타입 설정에 DOM 타입이 없음)
    Object.assign(globalThis, { ReactNativeWebView: { postMessage: () => {} } });
  });

test.describe('앱 안에서 연 초대 링크', () => {
  test('누르지 않아도 바로 확인해 초대를 보관하고 초대 확인 화면으로 간다', async ({ page }) => {
    await asAppShell(page);
    await page.goto('/invite/MOCKJOIN');

    await expect(page).toHaveURL(/\/onboarding\/join\/invitation$/);
    await expect(page.getByRole('article', { name: /여행가조/ })).toBeVisible();
  });

  test('이미 참여 중인 번치의 초대 링크는 피드로 보내고 이미 참여 중이라고 알린다', async ({
    page,
  }) => {
    // 가짜 서버가 발급한 형식(MOCK+번치 id)의 여행쥬아 초대. 나는 이미 여행쥬아 멤버
    await asAppShell(page);
    await page.goto('/invite/MOCK0001');

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByText('이미 참여 중인 번치예요.')).toBeVisible();
  });

  test('없는 초대 링크는 안내 토스트를 띄우고 초대를 보관하지 않는다', async ({ page }) => {
    await asAppShell(page);
    await page.goto('/invite/NOPE0000');

    await expect(page.getByText('유효하지 않은 링크입니다.')).toBeVisible();
    await expect(page).toHaveURL(/\/invite\/NOPE0000$/);
    await expect(page.getByRole('link', { name: '앱 설치하기' })).toHaveCount(0);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), PENDING_INVITATION_KEY))
      .toBeNull();
  });
});

test('보관된 초대로 참여하면 참여 완료 뒤 피드로 이동하고 보관한 초대를 지운다', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ invitation: 'MOCKJOIN', savedAt: Date.now() }));
  }, PENDING_INVITATION_KEY);
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding\/join\/invitation$/);
  await expect(
    page.getByRole('heading', { level: 1, name: '초대받은 번치에 참여할까요?' }),
  ).toBeVisible();

  await page.getByRole('button', { name: '참여하기' }).click();
  await expect(page).toHaveURL(/\/onboarding\/join\/complete$/);

  await page.getByRole('button', { name: '번치로 이동하기' }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), PENDING_INVITATION_KEY))
    .toBeNull();
});

test.describe('앱 밖(브라우저)에서 연 초대 링크', () => {
  test.describe('Android', () => {
    // WebKit project는 iPhone 기기라 iOS가 아닌 경우를 user agent로 고정
    test.use({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131.0 Mobile',
    });

    test('iOS가 아닌 기기는 초대장 확인하기를 눌러도 이동하지 않고 iOS 앱만 있다고 알린다', async ({
      page,
    }) => {
      await page.goto('/invite/MOCKJOIN');
      await clickUntil(page.getByRole('button', { name: '초대장 확인하기' }), () =>
        expect(page.getByText('지금은 iOS 앱만 지원해요.')).toBeVisible({ timeout: 2_000 }),
      );
      await expect(page).toHaveURL(/\/invite\/MOCKJOIN$/);
    });
  });

  test.describe('iPhone', () => {
    test.use({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    test('초대장 확인하기는 앱 열기 도메인으로 넘긴다(앱이 있으면 앱, 없으면 App Store)', async ({
      page,
    }) => {
      // 실제 앱 열기 도메인에는 나가지 않고 요청만 확인
      const opened: string[] = [];
      await page.route('https://open.bunch.kr/**', (route) => {
        opened.push(route.request().url());
        return route.fulfill({ status: 204 });
      });
      await page.goto('/invite/MOCKJOIN');
      await clickUntil(page.getByRole('button', { name: '초대장 확인하기' }), () =>
        expect
          .poll(() => opened, { timeout: 2_000 })
          .toContain('https://open.bunch.kr/invite/MOCKJOIN'),
      );
    });

    test('형식이 아닌 초대 링크는 넘기지 않고 안내한다', async ({ page }) => {
      await page.goto('/invite/bad.token');
      await clickUntil(page.getByRole('button', { name: '초대장 확인하기' }), () =>
        expect(page.getByText('유효하지 않은 링크입니다.')).toBeVisible({ timeout: 2_000 }),
      );
    });
  });
});

test.describe('앱 진입 시 보관된 초대와 기본 번치의 우선순위', () => {
  test('보관된 초대가 없으면 앱 진입과 로그인 화면은 번치 홈으로 보낸다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/bunch$/);
    await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();

    await page.goto('/login');
    await expect(page).toHaveURL(/\/bunch$/);
  });

  test('보관된 초대가 있으면 앱 진입이 초대 확인 화면으로 간다', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ invitation: 'MOCKJOIN', savedAt: Date.now() }));
    }, PENDING_INVITATION_KEY);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding\/join\/invitation$/);
    await expect(page.getByRole('article', { name: /여행가조/ })).toBeVisible();
  });

  test('24시간이 지난 초대는 버리고 번치 홈으로 간다', async ({ page }) => {
    // 보관 시각을 24시간 1분 전으로(만료 기준 PENDING_INVITATION_TTL_MS)
    await page.addInitScript((key) => {
      const savedAt = Date.now() - (24 * 60 + 1) * 60 * 1000;
      localStorage.setItem(key, JSON.stringify({ invitation: 'MOCKJOIN', savedAt }));
    }, PENDING_INVITATION_KEY);
    await page.goto('/');
    await expect(page).toHaveURL(/\/bunch$/);
    await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();
  });
});

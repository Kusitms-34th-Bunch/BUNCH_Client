import { expect, type Locator, type Page, test } from '@playwright/test';

// 자동 axe가 보지 못하는 키보드 동선: 열린 시트·메뉴 안에서만 초점이 돌고, Escape로 닫히며, 닫은 뒤 연 버튼으로 초점이 돌아옴
const OVERLAYS: {
  name: string;
  path: string;
  session?: 'owner';
  // 오버레이를 여는 버튼까지 가는 동작(없으면 바로 trigger)
  before?: (_page: Page) => Promise<void>;
  trigger: (_page: Page) => Locator;
  overlay: (_page: Page) => Locator;
  // 닫은 뒤 초점이 돌아갈 곳(없으면 trigger)
  returnTo?: (_page: Page) => Locator;
}[] = [
  {
    name: '번치 전환 시트',
    path: '/bunch',
    trigger: (page) => page.getByRole('button', { name: '여행쥬아' }),
    overlay: (page) => page.getByRole('dialog'),
  },
  {
    name: '번들 더보기 메뉴',
    path: '/bunches/1/bundles/1',
    trigger: (page) => page.getByRole('button', { name: '번들 더보기' }),
    overlay: (page) => page.getByRole('dialog'),
  },
  {
    name: '번들 삭제 확인 창',
    path: '/bunches/1/bundles/1',
    session: 'owner',
    // 메뉴도 키보드로 열어 초점 기록을 남김(macOS WebKit은 마우스 클릭으로 버튼에 초점을 주지 않음)
    before: async (page) => {
      await page.getByRole('button', { name: '번들 더보기' }).focus();
      await page.keyboard.press('Enter');
    },
    trigger: (page) => page.getByRole('button', { name: '삭제하기' }),
    overlay: (page) => page.getByRole('alertdialog', { name: '게시글을 삭제할까요?' }),
    // 메뉴가 닫힌 뒤 열리는 창이라 닫으면 메뉴를 연 버튼으로 돌아감
    returnTo: (page) => page.getByRole('button', { name: '번들 더보기' }),
  },
];

for (const item of OVERLAYS) {
  test(`${item.name}: 키보드로 열면 초점이 안에서만 돌고 Escape로 닫으면 연 버튼으로 돌아온다`, async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (item.session) {
      await page.addInitScript(
        (value) => localStorage.setItem('bunch:mock-session', value),
        item.session,
      );
    }
    await page.goto(item.path);
    await item.before?.(page);
    const trigger = item.trigger(page);
    await trigger.focus();
    await page.keyboard.press('Enter');
    const overlay = item.overlay(page);
    await expect(overlay).toBeVisible();
    // 열리면 초점이 바로 안으로 들어감
    await expect
      .poll(() => overlay.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);

    // Tab 가두기 확인은 Chromium만(macOS WebKit은 Tab이 버튼을 건너뛰고 Option+Tab은 실행마다 창 밖으로 빠져 흔들림)
    // iPad 키보드는 mobile-testing.md 체크리스트로 확인
    // 끝에서 Tab하면 Base UI 초점 가드(창 밖 span)가 잠깐 받은 뒤 처음으로 돌려 보내므로 돌아올 때까지 기다림(바로 읽으면 흔들림)
    for (let i = 0; i < (browserName === 'chromium' ? 8 : 0); i++) {
      await page.keyboard.press('Tab');
      await expect
        .poll(() => overlay.evaluate((el) => el.contains(document.activeElement)))
        .toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
    await expect((item.returnTo ?? item.trigger)(page)).toBeFocused();
  });
}

// 스크린 리더가 따라가는 접근성 트리의 순서(제목 → 사진 → 코멘트 → 반응 → 댓글 → 입력)와 이름 고정
test('번들 상세는 제목·사진·코멘트·반응·댓글·입력 순서로 읽힌다', async ({ page }) => {
  await page.goto('/bunches/1/bundles/1');
  await expect(page.getByRole('heading', { level: 1, name: '강릉 커피 투어 ☕' })).toBeVisible();

  await expect(page.locator('body')).toMatchAriaSnapshot(`
    - banner:
      - button "뒤로 가기"
      - button "번들 더보기"
    - main:
      - heading "강릉 커피 투어 ☕" [level=1]
      - group "번들 사진"
      - region "멤버별 코멘트"
      - button /좋아요 \\d+/
      - button /댓글 \\d+/
      - region "댓글"
    - region "댓글 작성":
      - textbox "여행쥬아로 댓글 달기"
  `);
});

test('번치 홈은 헤더·제목·만들기 버튼 순서로 읽힌다', async ({ page }) => {
  await page.goto('/bunch');
  await expect(page.getByRole('heading', { level: 1, name: '여행쥬아' })).toBeVisible();

  await expect(page.locator('body')).toMatchAriaSnapshot(`
    - banner:
      - button "여행쥬아"
      - link /알림/
      - link "더보기"
    - main:
      - heading "여행쥬아" [level=1]
    - button "번들 만들기"
  `);
});

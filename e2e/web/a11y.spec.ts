import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// 주요 화면과 열린 상태(시트·메뉴·확인 창·입력 오류)를 axe가 자동 판정할 수 있는 범위에서 확인(WCAG 2.2 A·AA + best-practice)
// 동작 줄이기로 모션 없이 검사해 전환 중 상태는 대상이 아님. 키보드 동선·읽는 순서는 별도 테스트(a11y-keyboard.spec.ts), 실제 VoiceOver 사용은 docs/workflows/mobile-testing.md 체크리스트
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// 알려진 위반(#226·#560, 디자이너 확인 요청): Figma 글자색이 배경 위에서 대비 부족(글자색/배경색)
// 보조 글자 #969AA0 2.82:1·#BCBEC2 1.86:1, 접근 불가 번치 #D5D7D9 1.44:1·칩 #BABDC0 1.82:1,
// 약관 전체 동의 #D1D4D9 1.42:1, 알림 칩 #FF53C5 2.61:1, 오류 문구 #F04D29 3.62:1
// 화면별로 요소 문구를 고정해 다른 요소가 같은 색을 쓰거나 색이 고쳐지면 실패
type ContrastData = { fgColor?: string; bgColor?: string };
const KNOWN_LOW_CONTRAST = new Set([
  '#969aa0/#ffffff',
  '#bcbec2/#ffffff',
  '#d5d7d9/#ffffff',
  '#babdc0/#fbfbfb',
  '#d1d4d9/#f9faff',
  '#ff53c5/#fff0fa',
  '#f04d29/#ffffff',
]);
const isKnownLowContrast = (node: { any: { id: string; data: unknown }[] }) => {
  const data = node.any.find((check) => check.id === 'color-contrast')?.data as
    | ContrastData
    | undefined;
  return KNOWN_LOW_CONTRAST.has(`${data?.fgColor}/${data?.bgColor}`);
};

// ready: 로딩 자리표시가 아니라 MSW 데이터·화면 내용이 그려진 상태를 기다릴 요소
// 가짜 서버의 시작 세션(apps/web/src/mocks/db/seed.ts `createSeedFor`), 없으면 기본(여행쥬아 멤버)
type Session = 'owner' | 'anonymous' | 'signup-terms';
const SCREENS: {
  name: string;
  path: string;
  session?: Session;
  knownLowContrast: string[];
  // 보이는 원보다 넓은 터치 영역을 ::before로 둔 버튼(axe는 가상 요소를 보지 못해 원 크기로 판정)의 접근성 이름 끝부분
  // 예외로 넘기는 대신 아래에서 실제 ::before 크기가 24px 이상인지 확인
  knownSmallTargets?: string[];
  // 검사 전에 여는 시트·메뉴·확인 창이나 입력
  open?: (_page: Page) => Promise<void>;
  ready: (_page: Page) => ReturnType<Page['locator']>;
}[] = [
  {
    name: '번치 홈',
    path: '/bunch',
    knownLowContrast: [],
    ready: (page) => page.getByRole('heading', { level: 1, name: '여행쥬아' }),
  },
  // 사진함 자리표시에도 h1이 있어 날짜별 묶음 제목으로 목록이 그려졌는지 확인(MSW fixture에 사진이 있어야 함)
  {
    name: '사진함',
    path: '/photos',
    knownLowContrast: [],
    ready: (page) => page.getByRole('heading', { level: 2 }).first(),
  },
  {
    name: '마이페이지',
    path: '/my',
    knownLowContrast: [],
    ready: (page) => page.getByRole('link', { name: '알림 설정' }),
  },
  {
    name: '개인 프로필 수정',
    path: '/my/profile',
    // 선택 약관 미동의가 기본이라 출생연도·성별 칸과 비공개 안내는 보이지 않음
    knownLowContrast: [],
    ready: (page) => page.getByRole('button', { name: '프로필 사진 변경' }),
  },
  {
    name: '알림 설정',
    path: '/my/notifications',
    knownLowContrast: [],
    ready: (page) => page.getByRole('switch', { name: '앱 푸시 알림' }),
  },
  {
    name: '피드',
    path: '/feed',
    knownLowContrast: [],
    ready: (page) => page.getByRole('article').first(),
  },
  {
    name: '번들 상세',
    path: '/bunches/1/bundles/1',
    knownLowContrast: [],
    ready: (page) => page.getByRole('heading', { level: 1, name: '강릉 커피 투어 ☕' }),
  },
  {
    name: '번들 작성',
    path: '/bunch',
    knownLowContrast: ['추가', '코멘트와 픽하기는 업로드 이후 수정이 불가해요'],
    // DeleteButton M: 16px 원 + 32px 터치 영역
    knownSmallTargets: ['번째 사진 빼기'],
    open: async (page) => {
      await page.getByRole('button', { name: '번들 만들기' }).click();
      await page
        .getByRole('button', { name: /추가하기/ })
        .first()
        .click();
      await page.getByRole('button', { name: '다음' }).click();
      await expect(page.getByText('누구와 함께 만들까요?')).toBeHidden();
      await page.getByRole('button', { name: '2026-10-18에 찍은 사진' }).first().click();
      await page.getByRole('button', { name: '다음' }).click();
    },
    ready: (page) => page.getByRole('textbox', { name: '번들 제목' }),
  },
  {
    name: '로그인',
    path: '/login',
    session: 'anonymous',
    knownLowContrast: [],
    ready: (page) => page.getByRole('button', { name: '카카오 로그인' }),
  },
  {
    name: '가입 약관',
    path: '/signup/terms',
    session: 'signup-terms',
    knownLowContrast: [
      '전체 동의하기',
      '[필수]',
      '서비스 이용 약관',
      '[필수]',
      '개인정보 수집 및 이용 동의',
      '[필수]',
      '만 14세 이상입니다',
      '[선택]',
      '추가 개인정보 수집 및 이용 동의',
    ],
    ready: (page) => page.getByRole('checkbox', { name: '전체 동의하기' }),
  },
  {
    name: '번치 시작 선택',
    path: '/onboarding',
    knownLowContrast: [],
    ready: (page) => page.getByRole('heading', { level: 1 }),
  },
  {
    name: '번치 전환 시트(열림)',
    path: '/bunch',
    knownLowContrast: ['알림 1개', '홍대역', '접근 불가', '큐시즘 맛집', '접근 불가'],
    open: (page) => page.getByRole('button', { name: '여행쥬아' }).click(),
    ready: (page) => page.getByRole('dialog'),
  },
  {
    name: '번들 더보기 메뉴(열림)',
    path: '/bunches/1/bundles/1',
    knownLowContrast: [],
    open: (page) => page.getByRole('button', { name: '번들 더보기' }).click(),
    ready: (page) => page.getByRole('dialog'),
  },
  {
    name: '번들 삭제 확인 창(열림)',
    path: '/bunches/1/bundles/1',
    session: 'owner',
    knownLowContrast: [],
    open: async (page) => {
      await page.getByRole('button', { name: '번들 더보기' }).click();
      await page.getByRole('button', { name: '삭제하기' }).click();
    },
    ready: (page) => page.getByRole('alertdialog', { name: '게시글을 삭제할까요?' }),
  },
  {
    name: '닉네임 중복 오류',
    path: '/my/profile',
    knownLowContrast: ['이미 사용 중인 닉네임이에요'],
    // 가짜 서버는 「중복」이 들어간 닉네임을 사용 중으로 취급
    open: (page) => page.getByRole('textbox', { name: '닉네임' }).fill('중복닉'),
    ready: (page) => page.getByRole('alert').filter({ hasText: /사용 중/ }),
  },
];

for (const screen of SCREENS) {
  test(`${screen.name} 화면에 axe 자동 검사 위반이 없다`, async ({ page }, testInfo) => {
    // 전환 애니메이션 중 겹친 화면·투명도로 색 계산이 흔들리지 않도록
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (screen.session) {
      await page.addInitScript((value) => {
        localStorage.setItem('bunch:mock-session', value);
        localStorage.setItem('bunch:intro-seen', '1');
      }, screen.session);
    }
    await page.goto(screen.path);
    await screen.open?.(page);
    await expect(screen.ready(page)).toBeVisible();
    await page.evaluate('document.fonts.ready');
    // 시트·창이 열리는 투명도 모션 중간에는 색이 섞여 대비가 흔들려 모션이 끝난 뒤 검사
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((motion) => motion.finished)),
    );

    // Base UI 초점 가두기 보조 요소(tabindex 0, 숨김)는 WebKit에서만 이름 없는 명령으로 잡혀 제외
    const { violations, incomplete } = await new AxeBuilder({ page })
      .withTags(TAGS)
      .exclude('[data-base-ui-focus-guard]')
      .analyze();

    // 요소 html 안에 예외 문구가 그 요소의 글자로 그대로 들어 있는지로 판정(html을 가공하지 않음)
    const knownTextOf = (html: string) =>
      screen.knownLowContrast.find((text) => html.includes(`>${text}</`));
    const known: string[] = [];
    const found = violations
      .map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes
          .filter((node) => {
            if (
              id === 'target-size' &&
              screen.knownSmallTargets?.some((label) => node.html.includes(`${label}"`))
            )
              return false;
            const text =
              id === 'color-contrast' && isKnownLowContrast(node)
                ? knownTextOf(node.html)
                : undefined;
            if (text) known.push(text);
            return !text;
          })
          .map((node) => node.html.slice(0, 200)),
      }))
      .filter(({ nodes }) => nodes.length > 0);

    // axe가 판정하지 못한 항목(겹친 요소 위 대비 등)은 수동 확인 지점으로 남김
    testInfo.annotations.push({
      type: 'axe incomplete',
      description: incomplete.map(({ id, nodes }) => `${id} ${nodes.length}`).join(', ') || '없음',
    });
    expect(found).toEqual([]);
    for (const label of screen.knownSmallTargets ?? []) {
      const sizes = await page.locator(`button[aria-label$="${label}"]`).evaluateAll((buttons) =>
        buttons.map((button) => {
          const before = getComputedStyle(button, '::before');
          const rect = button.getBoundingClientRect();
          const inset = (value: string) => -Number.parseFloat(value || '0');
          return Math.min(
            rect.width + inset(before.left) + inset(before.right),
            rect.height + inset(before.top) + inset(before.bottom),
          );
        }),
      );
      expect(sizes.length, `${label} 버튼이 있어야 함`).toBeGreaterThan(0);
      for (const size of sizes) expect(size, `${label} 터치 영역`).toBeGreaterThanOrEqual(24);
    }
    // 엔진마다 색 계산이 조금 달라 고쳐졌는지는 Chromium 기준으로만 판정
    if (testInfo.project.name.includes('chromium')) {
      expect(known.toSorted(), '알려진 대비 위반이 고쳐졌으면 예외 목록에서 지움').toEqual(
        screen.knownLowContrast.toSorted(),
      );
    }
  });
}

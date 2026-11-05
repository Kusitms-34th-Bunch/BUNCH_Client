import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// smoke 흐름 화면의 기본 상태를 axe가 자동 판정할 수 있는 범위에서 확인(WCAG 2.2 A·AA + best-practice)
// 키보드 동선·포커스 이동·스크린 리더 읽기, 입력 오류·오버레이 같은 다른 상태는 대상이 아님
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// 알려진 위반(#226, 디자이너 확인 요청): Figma 보조 글자색이 흰 배경에서 대비 부족
// text-quaternary #969AA0 2.82:1, text-quinary #BCBEC2 1.86:1. 화면별로 요소 문구를 고정해 다른 요소가 같은 색을 쓰거나 색이 고쳐지면 실패
type ContrastData = { fgColor?: string; bgColor?: string };
const KNOWN_LOW_CONTRAST_COLORS = new Set(['#969aa0', '#bcbec2']);
const isKnownLowContrast = (node: { any: { id: string; data: unknown }[] }) => {
  const data = node.any.find((check) => check.id === 'color-contrast')?.data as
    ContrastData | undefined;
  return KNOWN_LOW_CONTRAST_COLORS.has(data?.fgColor ?? '') && data?.bgColor === '#ffffff';
};

// ready: 로딩 자리표시가 아니라 MSW 데이터·화면 내용이 그려진 상태를 기다릴 요소
const SCREENS: {
  name: string;
  path: string;
  knownLowContrast: string[];
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
    knownLowContrast: ['알림', '약관 및 정책', '고객지원'],
    ready: (page) => page.getByRole('link', { name: '알림 설정' }),
  },
  {
    name: '개인 프로필 수정',
    path: '/my/profile',
    knownLowContrast: ['출생연도와 성별은 다른 사용자에게 공개되지 않아요.'],
    ready: (page) => page.getByRole('button', { name: '프로필 사진 변경' }),
  },
  {
    name: '알림 설정',
    path: '/my/notifications',
    knownLowContrast: [],
    ready: (page) => page.getByRole('switch', { name: '앱 푸시 알림' }),
  },
];

for (const screen of SCREENS) {
  test(`${screen.name} 화면에 axe 자동 검사 위반이 없다`, async ({ page }, testInfo) => {
    // 전환 애니메이션 중 겹친 화면·투명도로 색 계산이 흔들리지 않도록
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(screen.path);
    await expect(screen.ready(page)).toBeVisible();
    await page.evaluate('document.fonts.ready');

    const { violations, incomplete } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

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
    expect(known.toSorted(), '알려진 대비 위반이 고쳐졌으면 예외 목록에서 지움').toEqual(
      screen.knownLowContrast.toSorted(),
    );
  });
}

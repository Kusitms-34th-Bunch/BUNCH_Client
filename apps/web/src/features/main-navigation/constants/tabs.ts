// 탭 경로는 탭 화면이 정해지기 전 임시 값(docs/specs/bottom-navigation.md 확인할 항목)
export const MAIN_TAB_PATHS = {
  feed: '/feed',
  photos: '/photos',
  bunch: '/bunch',
  my: '/my',
} as const;

export type MainTabId = keyof typeof MAIN_TAB_PATHS;

/** 탭 순서·라벨(아이콘은 웹 막대와 iOS 쉘이 같은 디자인 시스템 아이콘 사용) */
export const MAIN_TABS: { id: MainTabId; label: string }[] = [
  { id: 'feed', label: '피드' },
  { id: 'photos', label: '사진함' },
  { id: 'bunch', label: '번치' },
  { id: 'my', label: '마이페이지' },
];

/** 현재 경로가 속한 탭(탭 안 하위 경로 포함), 없으면 null */
export const findMainTab = (pathname: string): MainTabId | null =>
  MAIN_TABS.find(({ id }) => {
    const path = MAIN_TAB_PATHS[id];
    return pathname === path || pathname.startsWith(`${path}/`);
  })?.id ?? null;

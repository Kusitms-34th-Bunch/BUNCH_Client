export const TAB_BAR_HEIGHT = 64;
const TAB_BAR_MIN_BOTTOM = 8;
const TAB_BAR_CONTENT_GAP = 8;

/** iOS 외 환경 및 글라스 미지원 환경에서는 웹 탭 막대 사용 */
export const shouldUseNativeTabBar = (os: string, glassAvailable: boolean) =>
  os === 'ios' && glassAvailable;

/** 막대 위치는 홈 인디케이터 위에 겹치도록 정한 실기기 미검증 추정값 */
export const getTabBarLayout = (bottomInset: number) => {
  const bottom = Math.max(
    (Number.isFinite(bottomInset) ? bottomInset : 0) - TAB_BAR_MIN_BOTTOM,
    TAB_BAR_MIN_BOTTOM,
  );
  return { bottom, height: TAB_BAR_HEIGHT, inset: bottom + TAB_BAR_HEIGHT + TAB_BAR_CONTENT_GAP };
};

export const buildTabBarInsetScript = (inset: number) => {
  const value = Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0;
  return `(function(){var d=document.documentElement;if(d){d.style.setProperty('--native-tab-bar-inset','${value}px');}})();true;`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** 막대 안쪽 영역 기준 x 좌표가 가리키는 항목 번호 */
export const indexAtOffset = (offset: number, itemWidth: number, itemCount: number) =>
  itemWidth <= 0 || itemCount <= 0 ? 0 : clamp(Math.floor(offset / itemWidth), 0, itemCount - 1);

/** 끄는 동안 손가락 아래 중앙에 알약 배치 및 막대 안으로 제한 */
export const pillOffsetAt = (offset: number, itemWidth: number, totalWidth: number) =>
  clamp(offset - itemWidth / 2, 0, Math.max(totalWidth - itemWidth, 0));

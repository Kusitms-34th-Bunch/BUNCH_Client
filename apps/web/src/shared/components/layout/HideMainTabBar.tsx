/**
 * 렌더되는 동안 하단 탭 막대를 숨기는 표식(선택 모드처럼 탭 이동을 막는 화면용)
 * `(main)/layout.tsx`가 `data-hide-main-tab-bar`를 CSS `:has()`로 감지해 막대를 숨기고 `--main-tab-bar-*` 변수를 0으로 되돌림
 */
export function HideMainTabBar() {
  return <span hidden data-hide-main-tab-bar="" />;
}

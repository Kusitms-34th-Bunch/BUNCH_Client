import type { ReactNode } from 'react';

type AppFrameProps = {
  children: ReactNode;
};

/**
 * 일반 화면의 바깥 틀: 폭·중앙 정렬·화면 높이·Safe Area(상하좌우)
 * Safe Area 여백은 여기서만 적용(하위에서 다시 더하면 이중 적용)
 * 배경: 나가는 화면(data-page-leaving)의 표식은 무시. 웹 탭 막대가 있는 화면만 탭 크로스페이드와 같은 80ms 등속으로 전환(결정 기록 017)
 */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="has-[[data-app-background=brand-subtle-1]:not([data-page-leaving]_*)]:bg-surface-brand-subtle-1 bg-surface-primary mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pb-(--safe-area-bottom) pl-(--safe-area-left) motion-safe:has-data-main-tab-bar:transition-colors motion-safe:has-data-main-tab-bar:duration-80 motion-safe:has-data-main-tab-bar:ease-linear">
      {children}
    </div>
  );
}

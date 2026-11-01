import type { ReactNode } from 'react';

type AppFrameProps = {
  children: ReactNode;
};

/**
 * 일반 화면의 바깥 틀: 폭·중앙 정렬·화면 높이·Safe Area(상하좌우)
 * Safe Area 여백은 여기서만 적용(하위에서 다시 더하면 이중 적용)
 * 배경: 나가는 화면(data-page-leaving)의 표식은 무시하고 화면이 바뀔 때 상태 바·홈 인디케이터 영역도 함께 전환(결정 기록 017)
 * 기본 150ms ease-out(번치 추가 디졸브), 웹 탭 막대가 있으면 탭 크로스페이드와 같은 80ms 등속
 * Next가 새 화면을 그리는 순간 이전 화면이 잠깐 빠져 배경이 먼저 바뀌므로 전환이 시작되기 전부터 transition을 걸어 둠
 * data-app-background-instant 화면(참여 모션 → 초대 확인)은 앞 화면 장식이 Safe Area를 덮고 있어 즉시 변경
 */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div
      data-app-frame
      className="has-[[data-app-background=brand-subtle-1]:not([data-page-leaving],[data-page-leaving]_*)]:bg-surface-brand-subtle-1 bg-surface-primary mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pb-(--safe-area-bottom) pl-(--safe-area-left) has-data-app-background-instant:transition-none motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out motion-safe:has-data-main-tab-bar:duration-80 motion-safe:has-data-main-tab-bar:ease-linear"
    >
      {children}
    </div>
  );
}

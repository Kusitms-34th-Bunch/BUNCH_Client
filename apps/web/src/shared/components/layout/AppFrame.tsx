import type { ReactNode } from 'react';

type AppFrameProps = {
  children: ReactNode;
};

/**
 * 일반 화면의 바깥 틀: 폭·중앙 정렬·화면 높이·Safe Area(상하좌우)
 * Safe Area 여백은 여기서만 적용(하위에서 다시 더하면 이중 적용)
 */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pb-(--safe-area-bottom) pl-(--safe-area-left)">
      {children}
    </div>
  );
}

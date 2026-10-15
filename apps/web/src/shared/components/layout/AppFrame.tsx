import type { ReactNode } from 'react';

type AppFrameProps = {
  children: ReactNode;
};

/**
 * 일반 화면이 공유하는 바깥 틀이다. 공통 폭·중앙 정렬·화면 높이·Safe Area(상하좌우)를 맡는다.
 * 좌우 Safe Area는 노치 기기를 가로로 돌린 브라우저에서만 값이 생긴다(앱은 세로로 고정되어 있다).
 * Safe Area 여백은 여기서만 적용한다. 하위(PageShell 등)에서 다시 더하면 중복된다.
 */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pb-(--safe-area-bottom) pl-(--safe-area-left)">
      {children}
    </div>
  );
}

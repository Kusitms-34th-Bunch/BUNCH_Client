import type { ReactNode } from 'react';
import { OverlayProvider } from 'overlay-kit';
import { AppFrame } from '@/shared/components/layout/AppFrame';

// 일반 화면 틀(폭·Safe Area·높이) — 전체 화면 캔버스 화면은 이 group 밖에 배치
// OverlayProvider: `overlay.open()`으로 여는 모달·바텀시트를 그리는 자리(overlay-kit)
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OverlayProvider>
      <AppFrame>{children}</AppFrame>
    </OverlayProvider>
  );
}

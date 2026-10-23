import type { ReactNode } from 'react';
import { Toaster } from '@app/design-system';
import localFont from 'next/font/local';
import { OverlayProvider } from 'overlay-kit';
import { AppFrame } from '@/shared/components/layout/AppFrame';
import { QueryProvider } from '@/shared/query/QueryProvider';
import { AppTransitions } from './AppTransitions';

// Pretendard 1.3.9 가변 폰트 한 파일(SIL OFL 1.1). 처음 오는 웹 화면과의 구분: docs/decisions/records/013-pretendard-self-hosting.md
const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  weight: '45 920',
  display: 'swap',
});

// 토큰의 글꼴 이름을 불러온 글꼴로 교체. 모달·토스트가 body에 portal로 그려져 :root에 적용
const fontStyle = `:root{--primitive-font-family-pretendard:${pretendard.style.fontFamily};}body{font-family:var(--primitive-font-family-pretendard);}`;

// 일반 화면 틀(폭·Safe Area·높이) — 전체 화면 캔버스 화면은 이 group 밖에 배치
// Toaster: `toast()`가 띄우는 알림을 그리는 자리(앱에 한 번만 배치)
// OverlayProvider: `overlay.open()`으로 여는 모달·바텀시트를 그리는 자리(overlay-kit)
// QueryProvider: 서버 상태 캐시(TanStack Query). 모달 안 화면도 쓰도록 OverlayProvider 바깥에 배치
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <OverlayProvider>
        <style>{fontStyle}</style>
        <AppFrame>
          <AppTransitions>{children}</AppTransitions>
        </AppFrame>
        <Toaster />
      </OverlayProvider>
    </QueryProvider>
  );
}

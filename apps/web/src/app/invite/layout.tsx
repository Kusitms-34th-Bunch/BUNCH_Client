import type { ReactNode } from 'react';
import { Toaster } from '@app/design-system';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { pretendardFontStyle } from '../fonts/pretendard';

// 앱 밖(카카오톡 등)에서 들어온 사람도 보는 공개 진입 페이지라 `(app)`의 접근 가드(AuthGate)·화면 틀 밖에 둠
// 전체 화면 캔버스 화면이라 AppFrame 없이 자체 틀을 씀. 조회 요청과 토스트에 필요한 Provider만 둠
// OverlayProvider·PendingToast·RouteFocus·NativeTabBarVisibility가 없어 모달·바텀시트(`overlay.open`)와 화면 이동에 예약하는 토스트는 이 트리에서 쓸 수 없음
// 앱 WebView가 이 주소를 열게 되면(유니버셜 링크 후속) iOS 쉘의 탭 바 숨김 처리를 함께 맞춰야 함
export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <style>{pretendardFontStyle}</style>
      {children}
      <Toaster />
    </QueryProvider>
  );
}

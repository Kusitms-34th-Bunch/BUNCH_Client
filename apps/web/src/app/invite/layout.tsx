import type { ReactNode } from 'react';
import { Toaster } from '@app/design-system';
import { NativeTabBarVisibility } from '@/features/main-navigation/components';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { pretendardFontStyle } from '../fonts/pretendard';

// 앱 밖(카카오톡 등)에서 들어온 사람도 보는 공개 진입 페이지라 `(app)`의 접근 가드(AuthGate)·화면 틀 밖에 둠
// 전체 화면 캔버스 화면이라 AppFrame 없이 자체 틀을 씀. 조회 요청과 토스트에 필요한 Provider만 둠
// OverlayProvider·PendingToast·RouteFocus가 없어 모달·바텀시트(`overlay.open`)와 화면 이동에 예약하는 토스트는 이 트리에서 쓸 수 없음
// NativeTabBarVisibility: 유니버셜 링크로 앱의 탭 WebView가 이 주소를 열면 iOS 시스템 탭 바를 숨김(탭 경로가 아니라 숨김, 브라우저에서는 아무 일 없음)
export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <style>{pretendardFontStyle}</style>
      {children}
      <Toaster />
      <NativeTabBarVisibility />
    </QueryProvider>
  );
}

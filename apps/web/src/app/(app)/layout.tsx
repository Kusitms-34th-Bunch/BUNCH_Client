import type { ReactNode } from 'react';
import { Toaster } from '@app/design-system';
import { OverlayProvider } from 'overlay-kit';
import { AuthGate } from '@/features/auth/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { NativeTabBarVisibility } from '@/features/main-navigation/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { AppFrame } from '@/shared/components/layout/AppFrame';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { pretendardFontStyle } from '../fonts/pretendard';
import { AppTransitions } from './AppTransitions';
import { PendingToast } from './PendingToast';
import { RouteFocus } from './RouteFocus';

// 일반 화면 틀(폭·Safe Area·높이) — 전체 화면 캔버스 화면은 이 group 밖에 배치
// Toaster: `toast()`가 띄우는 알림을 그리는 자리(앱에 한 번만 배치)
// OverlayProvider: `overlay.open()`으로 여는 모달·바텀시트를 그리는 자리(overlay-kit)
// QueryProvider: 서버 상태 캐시(TanStack Query). 모달 안 화면도 쓰도록 OverlayProvider 바깥에 배치
// NativeTabBarVisibility: iOS 쉘에서 탭 밖 화면을 여는 동안 시스템 탭 바 숨김(모든 화면에서 경로를 따라야 해 여기 배치)
// RouteFocus: 다른 화면으로 이동하면 새 화면의 h1으로 초점(모든 화면 공통이라 여기 배치)
// PendingToast: 화면 이동과 함께 예약한 토스트를 도착 화면의 전환·로딩이 끝난 뒤 띄움(모든 화면 공통이라 여기 배치)
// AuthGate: 서버가 알려 준 로그인·가입 상태로 화면 접근을 제어(Query 안이어야 함). 가입을 마친 사용자의 도착 경로는 다른 feature 소유라 여기서 조합
const DESTINATIONS = {
  bunchHome: BUNCH_HOME_PATHS.home,
  bunchStart: ONBOARDING_PATHS.start,
  inviteEntry: ONBOARDING_PATHS.joinBunchEnter,
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <OverlayProvider>
        <style>{pretendardFontStyle}</style>
        <AppFrame>
          <AuthGate destinations={DESTINATIONS}>
            <AppTransitions>{children}</AppTransitions>
          </AuthGate>
        </AppFrame>
        <NativeTabBarVisibility />
        <RouteFocus />
        <PendingToast />
        <Toaster />
      </OverlayProvider>
    </QueryProvider>
  );
}

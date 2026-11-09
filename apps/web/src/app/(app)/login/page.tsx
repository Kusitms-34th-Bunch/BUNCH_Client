import { DevTokenLogin, LoginEntry } from '@/features/auth/components';
import { LOGIN_PATH } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { isDevTokenLoginEnabled } from '@/shared/api/devTokenFlag';

// 가입을 마친 사용자의 도착 화면은 다른 feature 소유라 route에서 조합해 넘김
const DESTINATIONS = { bunchHome: BUNCH_HOME_PATHS.home, bunchStart: ONBOARDING_PATHS.start };

export default function LoginPage() {
  return (
    <div
      data-ssgoi-transition={LOGIN_PATH}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <LoginEntry destinations={DESTINATIONS} />
      {/* 개발 전용 토큰 로그인: 서버가 요청 시점에 판단하는 진입점(운영 빌드 제외, 변수가 클라이언트 번들에 들어가지 않음) */}
      {isDevTokenLoginEnabled() ? <DevTokenLogin destinations={DESTINATIONS} /> : null}
    </div>
  );
}

import { DevTokenLogin, LoginEntry } from '@/features/auth/components';
import { LOGIN_PATH } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 개발 전용 토큰 로그인: 서버 전용 변수를 켠 개발·확인 환경에서만 진입점을 보임(운영 빌드 제외, 서버 컴포넌트가 읽어 클라이언트 번들에 변수가 들어가지 않음)
const DEV_TOKEN_LOGIN =
  process.env.NODE_ENV !== 'production' && process.env.DEV_TOKEN_LOGIN === 'enabled';
// 가입을 마친 사용자의 도착 화면은 다른 feature 소유라 route에서 조합해 넘김
const DESTINATIONS = { bunchHome: BUNCH_HOME_PATHS.home, bunchStart: ONBOARDING_PATHS.start };

export default function LoginPage() {
  return (
    <div
      data-ssgoi-transition={LOGIN_PATH}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <LoginEntry destinations={DESTINATIONS} />
      {DEV_TOKEN_LOGIN ? <DevTokenLogin destinations={DESTINATIONS} /> : null}
    </div>
  );
}

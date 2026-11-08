import { Suspense } from 'react';
import { DevWebLogin, LoginEntry } from '@/features/auth/components';
import { LOGIN_PATH } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 가입을 마친 사용자의 도착 화면은 다른 feature 소유라 route에서 조합해 넘김
const DESTINATIONS = { bunchHome: BUNCH_HOME_PATHS.home, bunchStart: ONBOARDING_PATHS.start };
// 개발 전용 카카오 웹 로그인(삭제 예정): 서버 전용 변수를 켠 개발·확인 환경에서만 진입점을 보임(서버 컴포넌트가 읽어 클라이언트 번들에 변수가 들어가지 않음)
const DEV_WEB_LOGIN = process.env.DEV_WEB_LOGIN === 'enabled';

export default function LoginPage() {
  return (
    <div
      data-ssgoi-transition={LOGIN_PATH}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <LoginEntry destinations={DESTINATIONS} />
      {DEV_WEB_LOGIN ? (
        <Suspense>
          <DevWebLogin />
        </Suspense>
      ) : null}
    </div>
  );
}

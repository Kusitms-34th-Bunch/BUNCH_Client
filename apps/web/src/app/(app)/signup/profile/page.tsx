import { ProfileSetup } from '@/features/auth/components';
import { SIGNUP_PATHS } from '@/features/auth/constants/paths';

// 가입을 마치면 가입 상태를 다시 읽은 가드(AuthGate)가 도착 화면(번치 시작 선택 등)으로 보냄
export default function SignupProfilePage() {
  return (
    <div
      data-ssgoi-transition={SIGNUP_PATHS.profile}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <ProfileSetup />
    </div>
  );
}

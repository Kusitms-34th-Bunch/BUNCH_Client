import { ProfileSetup } from '@/features/auth/components';
import { SIGNUP_PATHS } from '@/features/auth/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 가입을 마치면 번치 시작 선택으로 이동(이동 대상은 route가 정해 feature 간 import를 피함)
export default function SignupProfilePage() {
  return (
    <div
      data-ssgoi-transition={SIGNUP_PATHS.profile}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <ProfileSetup nextPath={ONBOARDING_PATHS.start} />
    </div>
  );
}

import { ProfileSetup } from '@/features/auth/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 가입을 마치면 번치 시작 선택으로 이동(이동 대상은 route가 정해 feature 간 import를 피함)
export default function SignupProfilePage() {
  return <ProfileSetup nextPath={ONBOARDING_PATHS.start} />;
}

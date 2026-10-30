import { BunchJoinInvitation } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { joinInvitationFixture } from '@/features/onboarding/fixtures/join.fixture';

export default function JoinBunchInvitationPage() {
  return (
    <div
      data-app-background="brand-subtle-1"
      data-ssgoi-transition={ONBOARDING_PATHS.joinBunchInvitation}
      // 초대장 로티가 끝나는 원 색(#f1f2ff)과 같은 의미 토큰
      className="bg-surface-brand-subtle-1 flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchJoinInvitation {...joinInvitationFixture} />
    </div>
  );
}

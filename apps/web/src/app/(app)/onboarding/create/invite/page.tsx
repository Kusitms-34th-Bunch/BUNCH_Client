import { BunchInvite } from '@/features/bunch-invite/components';
import { inviteLinkFixture } from '@/features/bunch-invite/fixtures/invite.fixture';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

export default function CreateBunchInvitePage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.createBunchInvite}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 번치를 만든 직후라 닫으면 피드로(뒤로 가기로 만들기 흐름에 돌아오지 않게 replace) */}
      <BunchInvite inviteLink={inviteLinkFixture} leaveHref={ONBOARDING_PATHS.feed} />
    </div>
  );
}

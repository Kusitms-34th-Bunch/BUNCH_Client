import { BunchInvite } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { inviteLinkFixture } from '@/features/onboarding/fixtures/invite.fixture';

export default function CreateBunchInvitePage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.createBunchInvite}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchInvite inviteLink={inviteLinkFixture} />
    </div>
  );
}

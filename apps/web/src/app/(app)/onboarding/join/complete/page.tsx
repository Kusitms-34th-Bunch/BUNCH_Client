import { BunchJoined } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { joinInvitationFixture } from '@/features/onboarding/fixtures/join.fixture';

export default function JoinBunchCompletePage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.joinBunchComplete}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchJoined
        bunchName={joinInvitationFixture.bunchName}
        imageSrc={joinInvitationFixture.imageSrc}
      />
    </div>
  );
}

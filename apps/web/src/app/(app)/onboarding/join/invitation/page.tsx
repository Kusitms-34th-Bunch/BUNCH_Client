import { BunchJoinInvitation } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

export default function JoinBunchInvitationPage() {
  return (
    <div
      data-app-background="secondary"
      data-ssgoi-transition={ONBOARDING_PATHS.joinBunchInvitation}
      className="bg-surface-secondary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchJoinInvitation />
    </div>
  );
}

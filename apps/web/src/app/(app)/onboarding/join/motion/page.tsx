import { BunchJoinMotion } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

export default function JoinBunchMotionPage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.joinBunchMotion}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchJoinMotion />
    </div>
  );
}

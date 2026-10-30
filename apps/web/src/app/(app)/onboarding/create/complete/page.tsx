import { BunchCreated } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

export default function CreateBunchCompletePage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.createBunchComplete}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchCreated />
    </div>
  );
}

import type { ReactNode } from 'react';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { CreateBunchDraftProvider } from '@/features/onboarding/contexts/CreateBunchDraftProvider';

// 경계는 실제 route와 함께 마운트하고, 단계·완료·초대 사이에는 draft를 유지한다.
export default function CreateBunchLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.createBunch}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <CreateBunchDraftProvider>{children}</CreateBunchDraftProvider>
    </div>
  );
}

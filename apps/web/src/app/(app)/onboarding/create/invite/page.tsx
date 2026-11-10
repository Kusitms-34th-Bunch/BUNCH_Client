'use client';

import { BunchInvite } from '@/features/bunch-invite/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { useCreatedBunchInvitation } from '@/features/onboarding/hooks/useCreatedBunchInvitation';

export default function CreateBunchInvitePage() {
  const invitation = useCreatedBunchInvitation();
  // 만든 번치가 없으면 첫 단계로 이동하는 중이라 아무것도 그리지 않음
  if (!invitation.ready) return null;

  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.createBunchInvite}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 번치를 만든 직후라 닫으면 피드로(뒤로 가기로 만들기 흐름에 돌아오지 않게 replace) */}
      <BunchInvite
        inviteLink={invitation.url}
        loading={invitation.loading}
        onRetry={invitation.failed ? invitation.retry : undefined}
        leaveHref={ONBOARDING_PATHS.feed}
      />
    </div>
  );
}

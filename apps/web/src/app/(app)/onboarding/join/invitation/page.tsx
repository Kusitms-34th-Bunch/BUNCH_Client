import { BunchJoinInvitation } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { joinInvitationFixture } from '@/features/onboarding/fixtures/join.fixture';

export default function JoinBunchInvitationPage() {
  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.joinBunchInvitation}
      // 초대장 로티가 끝나는 원 색(#f1f2ff)과 맞춘다. 의미 토큰 surface-brand-subtle-1은 #e2e4ff로 어긋나 있다(Button.spec.md)
      className="bg-primitive-bunch-50 flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchJoinInvitation {...joinInvitationFixture} />
    </div>
  );
}

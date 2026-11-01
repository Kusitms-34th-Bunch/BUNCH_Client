import type { Metadata } from 'next';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BunchInvite } from '@/features/bunch-invite/components';
import { inviteLinkFixture } from '@/features/bunch-invite/fixtures/invite.fixture';

// 번치 관리 화면이라 검색에서 제외. 모든 역할이 멤버를 초대할 수 있음(기능명세 5장 권한 표)
export const metadata: Metadata = { title: '멤버 초대', robots: { index: false } };

export default function BunchMemberInvitePage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.invite}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 멤버 관리·더보기 메뉴에서 들어오므로 닫으면 이전 화면으로 */}
      <BunchInvite
        inviteLink={inviteLinkFixture}
        leaveHref={BUNCH_HOME_PATHS.members}
        backOnLeave
      />
    </div>
  );
}

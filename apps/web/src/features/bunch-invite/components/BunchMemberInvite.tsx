'use client';

import { useMyBunchInvitation } from '../hooks/useMyBunchInvitation';
import { BunchInvite } from './BunchInvite';

/** 번치 멤버 초대(멤버 관리·더보기 메뉴에서 진입): 지금 번치의 실제 초대 링크를 받아 보여 줌, 닫으면 이전 화면 */
export function BunchMemberInvite({ leaveHref }: { leaveHref: string }) {
  const invitation = useMyBunchInvitation();
  return (
    <BunchInvite
      inviteLink={invitation.url}
      loading={invitation.loading}
      onRetry={invitation.failed ? invitation.retry : undefined}
      leaveHref={leaveHref}
      backOnLeave
    />
  );
}

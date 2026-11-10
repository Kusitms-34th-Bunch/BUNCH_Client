'use client';

import { useCreateBunchDraft } from '../contexts/createBunchDraftContext';
import { useBunchInvitationQuery } from '../queries/bunches';
import { useCreateBunchGuard } from './useCreateBunchGuard';

/**
 * 번치를 만든 직후 멤버 초대 화면의 초대 링크(기획 2.4.1)
 * 만든 번치가 없으면(직접 진입·새로고침) 번치 만들기 첫 단계로 보내고 아무것도 요청하지 않음
 */
export function useCreatedBunchInvitation() {
  const ready = useCreateBunchGuard(3);
  const { createdBunch } = useCreateBunchDraft();
  const invitation = useBunchInvitationQuery(ready ? createdBunch?.id : undefined);

  return {
    /** 화면을 그려도 되는지(false면 다른 화면으로 이동 중) */
    ready,
    url: invitation.data?.url,
    // 처음 불러오는 중과 실패 뒤 다시 불러오는 중(링크가 아직 없는 동안 요청 중)
    loading:
      invitation.data === undefined &&
      (invitation.isFetching || (invitation.isPending && invitation.fetchStatus === 'paused')),
    failed: invitation.isError,
    retry: () => void invitation.refetch(),
  };
}

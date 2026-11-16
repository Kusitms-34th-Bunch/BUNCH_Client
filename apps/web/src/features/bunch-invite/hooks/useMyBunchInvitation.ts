'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { bunchInvitationQueryOptions } from '@/shared/query/bunchInvitation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

/**
 * 지금 보는 번치(내 기본 번치)의 초대 링크. 내 정보를 받은 뒤 그 번치의 링크를 발급·조회
 * 소속 번치가 없거나 둘 중 하나라도 실패하면 실패로 보고, 다시 시도로 실패한 쪽부터 다시 받음
 */
export function useMyBunchInvitation() {
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  const invitation = useQuery(bunchInvitationQueryOptions(bunchId));
  // 번치가 없으면 링크를 요청하지 않아(skipToken) 받는 중으로 남지 않게 따로 판단
  const noBunch = me.isSuccess && bunchId === undefined;

  // 링크를 받기 전이고 요청 중이거나 오프라인이라 대기 중(실패 뒤 다시 받는 중 포함)
  const waiting = (query: { isFetching: boolean; isPending: boolean; fetchStatus: string }) =>
    query.isFetching || (query.isPending && query.fetchStatus === 'paused');
  const loading = invitation.data === undefined && (waiting(me) || waiting(invitation));
  // 다시 받는 동안 오류 상태가 풀려도 다시 불러오기 영역(과 그 버튼의 초점)을 유지
  const [retrying, setRetrying] = useState(false);
  if (retrying && !loading) setRetrying(false);

  return {
    url: invitation.data?.url,
    loading,
    failed: me.isError || invitation.isError || noBunch || (retrying && loading),
    retry: () => {
      setRetrying(true);
      void (me.isError || noBunch ? me.refetch() : invitation.refetch());
    },
  };
}

import { queryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getMemberSocialProfile } from '../api/memberProfile';
import { toFeedMemberProfile } from '../model/memberProfile';
import { feedKeys } from './keys';

/** 멤버 프로필. 명의를 알기 전(undefined)에는 요청하지 않음 */
export const memberProfileQueryOptions = (memberId: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: feedKeys.member(memberId, viewerId ?? null),
    queryFn:
      viewerId === undefined ? skipToken : ({ signal }) => getMemberSocialProfile(memberId, signal),
    select: toFeedMemberProfile,
    // 팔로우는 번치 화면에서도 바뀌는데 그쪽은 이 캐시를 모름(feature 경계) → 들어올 때마다 다시 받음
    staleTime: 0,
  });

/** 멤버 프로필로 가기 전(누르기 시작·초점) 미리 받음. 들어가면 받아 둔 값으로 그리고 다시 받아 맞춤. 실패는 들어가서 다시 받음 */
export const usePrefetchMemberProfile = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (memberId: string, viewerId: string | null | undefined) => {
      if (viewerId === undefined) return;
      void queryClient.prefetchQuery({
        ...memberProfileQueryOptions(memberId, viewerId),
        // 누르는 동안 같은 프로필을 거듭 받지 않는 시간(들어가면 staleTime 0이라 다시 받음)
        staleTime: 10_000,
      });
    },
    [queryClient],
  );
};

/** 이 화면에서 팔로우를 바꾼 뒤 멤버 프로필을 다시 받음(팔로우 요청은 번치 쪽 기능이 보내므로 화면이 부름) */
export const useRefreshMemberProfile = (memberId: string) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: feedKeys.memberAll(memberId) }),
    [queryClient, memberId],
  );
};

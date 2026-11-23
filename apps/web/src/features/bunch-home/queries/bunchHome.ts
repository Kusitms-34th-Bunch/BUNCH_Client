import { isApiError } from '@app/api-core';
import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { MyBunches } from '@/shared/api/myBunches';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { toDomainId } from '@/shared/api/ids';
import { getMyProfile } from '@/shared/api/myProfile';
import { sharedKeys } from '@/shared/query/keys';
import { persistedQuery } from '@/shared/query/persistence';
import {
  deleteBunchAccessNotice,
  getBunchAccessNotice,
  getBunchHome,
  getDraftBundles,
  getPublishedBundles,
  updateBunchProfile,
  type UpdateBunchProfileInput,
  updateLastUsedBunch,
} from '../api/bunchHome';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { FIRST_PAGE, nextPageOf } from '../lib/pages';
import { bunchHomeKeys } from './keys';

/**
 * 다른 멤버의 변경(가입, 번들 발행·초안)을 보이는 화면에 반영하는 갱신(들어올 때·앱 복귀 때·보이는 동안 20초마다)
 * 요청이 가벼운 단건 query에만 씀(쪽 단위 목록은 홈 개수가 바뀔 때만 다시 받음, useRefetchListsOnCountChange). 가려지면 멈춤
 */
export const LIVE_REFRESH = { staleTime: 0, refetchInterval: 20_000 } as const;

/** 번치 홈 프로필·개수. 번치를 아직 모르면 요청하지 않음(skipToken) */
export const bunchHomeQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchHome(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchHome(bunchId, signal) : skipToken,
    // 앱을 다시 열 때 번치 홈을 바로 그리도록 저장(shared/query/persistence.ts)
    ...persistedQuery,
  });

/**
 * 발행된 번들(쪽 단위, 그리드 끝에서 이어서 받음). 번들 발행 뒤에는 번치 홈 key 전체와 함께 무효화됨(`sharedKeys.bunchHomeScope`)
 * 앱을 열자마자 보이는 그리드라 저장함(받은 쪽 모두, 복원 뒤 오래됐으면 받은 쪽을 처음부터 다시 받음)
 */
export const publishedBundlesQueryOptions = (bunchId: string | undefined) =>
  infiniteQueryOptions({
    queryKey: bunchHomeKeys.publishedPages(bunchId),
    initialPageParam: FIRST_PAGE,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getPublishedBundles(bunchId, pageParam, signal)
      : skipToken,
    getNextPageParam: nextPageOf,
    ...persistedQuery,
  });

/** 작성 중인 번들 목록. 초안을 만들거나 나가거나 삭제하거나 발행한 뒤에는 번치 홈 key 전체와 함께 무효화됨 */
export const draftBundlesQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.draftBundles(bunchId),
    queryFn: bunchId ? ({ signal }) => getDraftBundles(bunchId, signal) : skipToken,
    ...persistedQuery,
  });

type HomeCounts = {
  publishedCount?: number | null | undefined;
  draftCount?: number | null | undefined;
  memberCount?: number | undefined;
};

/**
 * 홈 개수가 바뀐 목록(발행·작성 중 번들, 멤버)과 받기에 실패한 목록만 다시 받음(번치를 바꾼 직후 첫 값은 비교 안 함)
 * ponytail: 한 주기에 발행 1건·삭제 1건처럼 개수가 그대로인 변화는 목록이 오래된(5분) 뒤의 진입·당겨서 새로고침 때 반영
 */
export const useRefetchListsOnCountChange = (
  bunchId: string | undefined,
  counts: HomeCounts | undefined,
  homeUpdatedAt: number,
) => {
  const queryClient = useQueryClient();
  const last = useRef<(HomeCounts & { bunchId: string }) | undefined>(undefined);
  const { publishedCount, draftCount, memberCount } = counts ?? {};
  useEffect(() => {
    if (!bunchId || memberCount === undefined) return;
    const prev = last.current;
    last.current = { bunchId, publishedCount, draftCount, memberCount };
    const sameBunch = prev?.bunchId === bunchId;
    const lists = [
      [sameBunch && prev.publishedCount !== publishedCount, bunchHomeKeys.publishedPages(bunchId)],
      [sameBunch && prev.draftCount !== draftCount, sharedKeys.draftBundles(bunchId)],
      [sameBunch && prev.memberCount !== memberCount, sharedKeys.bunchMembers(bunchId)],
    ] as const;
    for (const [changed, queryKey] of lists) {
      // 진행 중인 다음 쪽 받기가 있어도 취소하고 첫 쪽부터 다시 받음(기본 cancelRefetch)
      const state = queryClient.getQueryState(queryKey);
      // 실패한 목록은 이미 다시 받는 중이면 그대로 둠(느린 장애에서 20초마다 취소되지 않게)
      const failed = state?.status === 'error' && state.fetchStatus !== 'fetching';
      if (changed || failed) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [queryClient, bunchId, publishedCount, draftCount, memberCount, homeUpdatedAt]);
};

/**
 * 번치 전환: 마지막 사용 번치를 저장한 뒤 기본 번치(`members/me`)를 다시 읽음(번들 목록은 저장과 함께, 번치 홈은 저장 뒤 받음)
 * 사진함·번들 만들기 등 앱 전체가 기본 번치를 보므로 모두 새 번치 기준이 됨(5.2.2 로직 2)
 * 새 번치 홈을 먼저 받아 두어 기본 번치가 바뀔 때 로딩 화면 없이 새 번치가 바로 그려짐
 * 기본 번치가 요청한 번치로 바뀌지 않았으면 실패로 던짐(성공 토스트만 뜨고 화면이 그대로인 것을 막음)
 * 미리 받기가 실패해도 기본 번치는 확인함: 저장이 됐으면 전환 성공이고 새 번치 홈은 화면이 다시 받음
 */
export const useSwitchBunchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bunchId: string) => {
      // 발행·작성 중 목록은 번치 id로만 정해져 저장과 동시에 받음(차례로 받으면 왕복이 하나 늘어 전환이 늦음, #532)
      // 번치 홈은 지금 번치인지(isCurrentBunch 등)가 저장 결과에 달려 저장 뒤 내 정보와 함께 받음. 5분 안의 저장값이어도 서버 값으로
      const lists = Promise.allSettled([
        queryClient.fetchInfiniteQuery({ ...publishedBundlesQueryOptions(bunchId), staleTime: 0 }),
        queryClient.fetchQuery({ ...draftBundlesQueryOptions(bunchId), staleTime: 0 }),
      ]);
      await updateLastUsedBunch(bunchId);
      // 저장 전에 시작한 members/me 응답(이전 번치)을 다시 쓰지 않게 멈춤
      await queryClient.cancelQueries({ queryKey: sharedKeys.me() });
      // 내 정보는 캐시 밖에서 받아 번치 홈까지 받은 뒤 넣음(먼저 넣으면 홈이 오기 전에 새 번치로 바뀌어 로딩이 보임)
      const [, , me] = await Promise.all([
        lists,
        queryClient
          .fetchQuery({ ...bunchHomeQueryOptions(bunchId), staleTime: 0 })
          .catch(() => undefined),
        getMyProfile(),
      ]);
      queryClient.setQueryData(sharedKeys.me(), me);
      if (me.bunch?.id !== bunchId) throw new Error('default bunch did not change');
      // 전환한 번치(이름으로 안내할 때 씀)
      return me.bunch;
    },
    // 실패해도 서버에 저장됐을 수 있어 기본 번치를 서버 기준으로 다시 맞춤
    onError: () => queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
  });
};

/** 삭제·내보내진 번치 안내 한 건. 안내 ID를 모르면 요청하지 않음 */
export const bunchAccessNoticeQueryOptions = (noticeId: string | undefined) =>
  queryOptions({
    queryKey: bunchHomeKeys.accessNotice(noticeId),
    queryFn: noticeId ? ({ signal }) => getBunchAccessNotice(noticeId, signal) : skipToken,
  });

/**
 * 보던 번치에 더는 들어갈 수 없을 때(삭제·내보내짐, 5.2.3 상세 동작 4)
 * 서버가 다시 고른 기본 번치(`members/me`)와 전환 목록을 받아 최근 번치나 번치 없음으로 바뀜
 */
export const useRefreshCurrentBunch = () => {
  const queryClient = useQueryClient();
  // 기본 번치가 그대로여도 접근 불가였던 번치 홈을 다시 받아 그사이 바뀐 상태를 반영
  return (bunchId: string | undefined) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(bunchId) }),
      queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
      queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
    ]);
};

/** 접근 불가 번치 안내 지우기. 성공하면 다시 읽지 않고 목록에서 그 줄만 뺌 */
export const useDeleteBunchNoticeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 안내 창이 닫혀 호출한 화면이 사라져도 알림(전환 목록·홈·알림이 같은 문구)
    meta: { errorMessage: BUNCH_HOME_MESSAGES.removeBunchFailed },
    // 이미 지워진 안내(404)는 지우려던 상태라 성공으로 봄
    mutationFn: (noticeId: string) =>
      deleteBunchAccessNotice(noticeId).catch((error: unknown) => {
        if (isApiError(error) && error.status === 404) return;
        throw error;
      }),
    onSuccess: async (_data, noticeId) => {
      // 서버에서 지운 안내라 다시 열면 받아 둔 값 대신 새로 받아 「볼 수 없음」이 되게 함
      queryClient.removeQueries({ queryKey: bunchHomeKeys.accessNotice(noticeId) });
      // 진행 중인 목록 재조회가 지우기 전 응답으로 덮지 않게 멈춘 뒤 그 줄만 뺌
      await queryClient.cancelQueries({ queryKey: sharedKeys.myBunches() });
      queryClient.setQueryData<MyBunches>(sharedKeys.myBunches(), (current) =>
        current
          ? {
              ...current,
              unavailableBunches: current.unavailableBunches.filter(
                (notice) => toDomainId(notice.id) !== noticeId,
              ),
            }
          : current,
      );
    },
    // 이미 지워진 안내(404) 등으로 실패하면 서버 기준으로 다시 맞춤
    onError: () => queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
  });
};

/**
 * 번치 프로필 저장. 성공하면 번치 홈을 다시 받아(프로필·버전) 끝낸 뒤 완료로 봄: 이동한 번치 홈에 새 값이 바로 보임
 * 이름·사진은 내 프로필(`members/me`의 기본 번치)과 전환 목록에도 보여 함께 무효화
 * 실패하면 화면이 번치 홈을 다시 받아 버전 충돌·권한 상실을 판단함
 */
export const useUpdateBunchProfileMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBunchProfileInput) => {
      if (bunchId === undefined) throw new Error('편집할 번치를 아직 모릅니다.');
      return updateBunchProfile(bunchId, input, createIdempotencyKey());
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope(bunchId) }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
      ]),
  });
};

/** 이미 삭제·발행된 초안을 알게 됐을 때 번치 홈 목록을 서버 기준으로 다시 받음(5.3.1) */
export const useRefreshBunchHomeLists = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return {
    refreshDrafts: () =>
      void queryClient.invalidateQueries({
        queryKey: sharedKeys.bunchHomeScope(bunchId),
        refetchType: 'all',
      }),
  };
};

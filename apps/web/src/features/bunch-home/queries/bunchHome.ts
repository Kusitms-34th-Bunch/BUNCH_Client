import { isApiError } from '@app/api-core';
import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { toDomainId } from '@/shared/api/ids';
import { sharedKeys } from '@/shared/query/keys';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { persistedQuery } from '@/shared/query/persistence';
import type { MyBunches } from '../model/bunchHome';
import {
  deleteBunchAccessNotice,
  getBunchHome,
  getDraftBundles,
  getMyBunches,
  getPublishedBundles,
  updateBunchProfile,
  type UpdateBunchProfileInput,
  updateLastUsedBunch,
} from '../api/bunchHome';

/** 번치 홈 프로필·개수. 번치를 아직 모르면 요청하지 않음(skipToken) */
export const bunchHomeQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchHome(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchHome(bunchId, signal) : skipToken,
    // 앱을 다시 열 때 번치 홈을 바로 그리도록 저장(shared/query/persistence.ts)
    ...persistedQuery,
  });

/** 발행된 번들 목록. 번들 발행 뒤에는 번치 홈 key 전체와 함께 무효화됨(`sharedKeys.bunchHomeScope`) */
export const publishedBundlesQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.publishedBundles(bunchId),
    queryFn: bunchId ? ({ signal }) => getPublishedBundles(bunchId, signal) : skipToken,
    ...persistedQuery,
  });

/** 작성 중인 번들 목록. 초안을 만들거나 나가거나 삭제하거나 발행한 뒤에는 번치 홈 key 전체와 함께 무효화됨 */
export const draftBundlesQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.draftBundles(bunchId),
    queryFn: bunchId ? ({ signal }) => getDraftBundles(bunchId, signal) : skipToken,
    ...persistedQuery,
  });

/** 내 소속 번치 목록(번치 전환 시트·소속 개수 한도) */
export const myBunchesQueryOptions = () =>
  queryOptions({
    queryKey: sharedKeys.myBunches(),
    queryFn: ({ signal }) => getMyBunches(signal),
    ...persistedQuery,
  });

/**
 * 번치 전환: 마지막 사용 번치를 저장한 뒤 기본 번치(`members/me`)를 다시 읽음
 * 사진함·번들 만들기 등 앱 전체가 기본 번치를 보므로 모두 새 번치 기준이 됨(5.2.2 로직 2)
 * 새 번치 홈을 먼저 받아 두어 기본 번치가 바뀔 때 로딩 화면 없이 새 번치가 바로 그려짐
 * 기본 번치가 요청한 번치로 바뀌지 않았으면 실패로 던짐(성공 토스트만 뜨고 화면이 그대로인 것을 막음)
 * 미리 받기가 실패해도 기본 번치는 확인함: 저장이 됐으면 전환 성공이고 새 번치 홈은 화면이 다시 받음
 */
export const useSwitchBunchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bunchId: string) => {
      await updateLastUsedBunch(bunchId);
      // 저장 전에 시작한 members/me 응답(이전 번치)을 다시 쓰지 않게 멈춤
      await queryClient.cancelQueries({ queryKey: sharedKeys.me() });
      await Promise.allSettled([
        // 저장해 둔 값이 5분 안이어도 전환한 번치는 서버 값으로 보임
        queryClient.fetchQuery({ ...bunchHomeQueryOptions(bunchId), staleTime: 0 }),
        queryClient.fetchQuery({ ...publishedBundlesQueryOptions(bunchId), staleTime: 0 }),
        queryClient.fetchQuery({ ...draftBundlesQueryOptions(bunchId), staleTime: 0 }),
      ]);
      const me = await queryClient.fetchQuery({ ...myProfileQueryOptions(), staleTime: 0 });
      if (me.bunch?.id !== bunchId) throw new Error('default bunch did not change');
    },
    // 실패해도 서버에 저장됐을 수 있어 기본 번치를 서버 기준으로 다시 맞춤
    onError: () => queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
  });
};

/** 접근 불가 번치 안내 지우기. 성공하면 다시 읽지 않고 목록에서 그 줄만 뺌 */
export const useDeleteBunchNoticeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 이미 지워진 안내(404)는 지우려던 상태라 성공으로 봄
    mutationFn: (noticeId: string) =>
      deleteBunchAccessNotice(noticeId).catch((error: unknown) => {
        if (isApiError(error) && error.status === 404) return;
        throw error;
      }),
    onSuccess: async (_data, noticeId) => {
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

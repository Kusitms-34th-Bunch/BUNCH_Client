import {
  type InfiniteData,
  infiniteQueryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import type { BlockPage } from '../model/blocks';
import { blockBunch, getBlockedBunches, reportBunch, unblockBunch } from '../api/blocks';
import { unfollowBunch } from '../api/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { FIRST_PAGE, nextPageOf } from '../lib/pages';
import { bunchHomeKeys } from './keys';

/** 내 번치(명의)가 차단한 번치(쪽 단위, 목록 끝에서 이어서 받음). 명의를 모르거나 번치가 없으면 요청하지 않음 */
export const blockedBunchesQueryOptions = (viewerId: string | null | undefined) =>
  infiniteQueryOptions({
    queryKey: bunchHomeKeys.blockPages(viewerId ?? undefined),
    initialPageParam: FIRST_PAGE,
    queryFn: viewerId
      ? ({ pageParam, signal }) => getBlockedBunches(viewerId, pageParam, signal)
      : skipToken,
    getNextPageParam: nextPageOf,
  });

/**
 * 다른 번치 차단. 성공하면 남은 팔로우를 해제하고(서버가 함께 정리하는지 몰라서, 이미 정리됐으면 무시)
 * 차단 목록과 그 번치(접근 제한), 팔로우 목록·내 번치 홈(수)을 다시 받음. 차단이 실패하면 팔로우는 그대로
 */
export const useBlockBunchMutation = (viewerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.blockFailed },
    mutationFn: async ({
      targetId,
      followId,
    }: {
      targetId: string;
      followId?: string | undefined;
    }) => {
      if (!viewerId) throw new Error('차단할 내 번치가 없습니다.');
      await blockBunch(viewerId, targetId);
      if (followId) await unfollowBunch(viewerId, targetId, followId).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: bunchHomeKeys.blocks(viewerId) });
      void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(targetId) });
      void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.follows() });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(viewerId) });
    },
  });
};

/** 차단 해제(메인·공동 관리자, 서버가 다시 검증). 끝나면 목록에서 바로 빼고 그 번치를 다시 받게 함 */
export const useUnblockBunchMutation = (viewerId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.unblockFailed },
    mutationFn: async ({ targetId, blockId }: { targetId: string; blockId: string }) => {
      if (!viewerId) throw new Error('차단을 해제할 내 번치가 없습니다.');
      await unblockBunch(viewerId, targetId, blockId);
      // 진행 중인 재조회가 빼기 전 응답으로 덮지 않게 멈춘 뒤 받은 쪽마다 그 줄을 빼고, 뒤 무효화가 쪽 번호를 다시 맞춤
      await queryClient.cancelQueries({ queryKey: bunchHomeKeys.blockPages(viewerId) });
      queryClient.setQueryData<InfiniteData<BlockPage, number>>(
        bunchHomeKeys.blockPages(viewerId),
        (data) => {
          if (!data) return data;
          // 같은 관계가 두 쪽에 겹쳐 받혀도 전체 수에서는 한 번만 뺌
          const removed = data.pages.some((page) =>
            page.items.some((item) => String(item.id) === blockId),
          )
            ? 1
            : 0;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => String(item.id) !== blockId),
              totalElements: Math.max(0, page.totalElements - removed),
            })),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.blocks(viewerId) });
      void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(targetId) });
    },
    // 실패하면 그 사이 다른 관리자가 해제했을 수 있어 목록을 다시 받음
    onError: () => queryClient.invalidateQueries({ queryKey: bunchHomeKeys.blocks(viewerId) }),
  });
};

/** 다른 번치 신고(접수만). 사유는 화면 값. 결과 안내는 신고 시트가 다 닫힌 뒤 화면이 띄움(실패 포함) */
export const useReportBunchMutation = (viewerId: string | null | undefined) =>
  useMutation({
    mutationFn: ({
      targetId,
      reason,
      detail,
    }: {
      targetId: string;
      reason: string;
      detail: string;
    }) => {
      if (!viewerId) throw new Error('신고할 내 번치가 없습니다.');
      return reportBunch(viewerId, targetId, { reason, detail });
    },
  });

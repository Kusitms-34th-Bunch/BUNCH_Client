import { isApiError } from '@app/api-core';
import {
  type InfiniteData,
  type QueryFilters,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toWireId } from '@/shared/api/ids';
import { sharedKeys } from '@/shared/query/keys';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { FeedPage } from '../model/feed';
import { setBundleLike } from '../api/like';
import { FEED_MESSAGES } from '../constants/messages';
import { patchDetailLike, patchFeedLike, toggledLike, type LikeState } from '../lib/likeCache';
import { bundleDetailKeys } from './bundleDetail';
import { feedKeys } from './feed';

type LikeVariables = { bundleId: number; liked: boolean };

const LIKE_KEY = ['bundle-like'] as const;
// 같은 scope의 요청은 순서대로 하나씩 보냄(연타해도 서버에 마지막 누른 값이 남음)
const LIKE_SCOPE = { id: 'bundle-like' };
// 연달아 누르는 동안 되돌릴 기준(첫 요청 직전 값, 앞선 요청이 성공하면 그 응답)을 명의·번들마다 보관
const confirmed = new Map<string, LikeState>();

/**
 * 번들 좋아요(지금 번치 명의, 명세 011·012). 누르면 피드 카드·상세 캐시를 바로 바꾸고 서버에 보냄
 * 마지막 요청이 실패하면 그 번들의 좋아요만 기준값으로 되돌리고 공통 토스트(`meta.errorMessage`), 앞선 결과는 뒤에 누른 값을 덮지 않음
 * 피드 목록은 쪽 전부를 다시 받지 않도록 성공 응답 값으로 확정하고, 상세만 다시 받음(docs/architecture/data-layer.md 예외)
 */
export const useBundleLikeMutation = (viewerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const feedFilters: QueryFilters = { queryKey: feedKeys.list(viewerId ?? null), exact: true };
  // 상세 key: [...all, bunchId, bundleId, viewerId]
  const detailFilters = (bundleId: number): QueryFilters => ({
    predicate: ({ queryKey }) =>
      queryKey[0] === bundleDetailKeys.all[0] &&
      queryKey[2] === String(bundleId) &&
      queryKey[3] === (viewerId ?? null),
  });
  const baseKey = (bundleId: number) => `${viewerId ?? '-'}:${bundleId}`;
  const apply = (bundleId: number, next: (_current: LikeState) => LikeState) => {
    queryClient.setQueriesData<InfiniteData<FeedPage>>(feedFilters, (data) =>
      patchFeedLike(data, bundleId, next),
    );
    queryClient.setQueriesData<BundleDetailResponse>(detailFilters(bundleId), (data) =>
      patchDetailLike(data, bundleId, next),
    );
  };
  /** 캐시에 있는 그 번들의 지금 좋아요(피드 카드 먼저, 없으면 상세) */
  const read = (bundleId: number): LikeState | undefined => {
    const card = queryClient
      .getQueriesData<InfiniteData<FeedPage>>(feedFilters)
      .flatMap(([, data]) => data?.pages ?? [])
      .flatMap((page) => page.items)
      .flatMap((item) => ('bundle' in item && item.bundle.id === bundleId ? [item.bundle] : []))[0];
    const detail = queryClient
      .getQueriesData<BundleDetailResponse>(detailFilters(bundleId))
      .find(([, data]) => data)?.[1];
    const source = card ?? detail;
    return (
      source && { likedByCurrentBunch: source.likedByCurrentBunch, likeCount: source.likeCount }
    );
  };
  const pendingFor = (bundleId: number) =>
    queryClient.isMutating({
      mutationKey: LIKE_KEY,
      predicate: (mutation) => (mutation.state.variables as LikeVariables)?.bundleId === bundleId,
    });

  return useMutation({
    mutationKey: LIKE_KEY,
    scope: LIKE_SCOPE,
    mutationFn: ({ bundleId, liked }: LikeVariables) => setBundleLike(bundleId, liked),
    meta: { errorMessage: FEED_MESSAGES.likeFailed },
    onMutate: async ({ bundleId, liked }) => {
      await Promise.all([
        queryClient.cancelQueries(feedFilters),
        queryClient.cancelQueries(detailFilters(bundleId)),
      ]);
      // 연달아 누른 첫 요청이면 누르기 전 값을 되돌릴 기준으로 남김
      const current = read(bundleId);
      if (current && !confirmed.has(baseKey(bundleId))) confirmed.set(baseKey(bundleId), current);
      apply(bundleId, (like) => toggledLike(like, liked));
    },
    onError: (error, { bundleId }) => {
      if (pendingFor(bundleId) > 1) return;
      const base = confirmed.get(baseKey(bundleId));
      confirmed.delete(baseKey(bundleId));
      if (base) apply(bundleId, () => base);
      // 권한·차단·삭제·번치 상태(403·404·409)는 화면의 전제가 낡은 것이라 명의와 피드를 다시 받음
      if (isApiError(error) && [403, 404, 409].includes(error.status ?? 0)) {
        void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
        void queryClient.invalidateQueries({ queryKey: feedKeys.all });
      }
    },
    onSuccess: (saved, { bundleId }) => {
      // 서버의 지금 번치가 화면 명의와 다르면(다른 기기에서 전환) 명의와 목록을 다시 받음
      if ((saved.currentBunchId ?? null) !== (viewerId ? (toWireId(viewerId) ?? null) : null)) {
        // 뒤 요청이 남았으면 그 요청이 실패할 때 쓸 기준값은 남겨 둠
        if (pendingFor(bundleId) <= 1) confirmed.delete(baseKey(bundleId));
        void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
        void queryClient.invalidateQueries({ queryKey: feedKeys.all });
        return;
      }
      const like = { likedByCurrentBunch: saved.likedByCurrentBunch, likeCount: saved.likeCount };
      // 뒤 요청이 남았으면 화면은 그대로 두고, 그 요청이 실패할 때 되돌릴 기준만 이 응답으로
      if (pendingFor(bundleId) > 1) {
        confirmed.set(baseKey(bundleId), like);
        return;
      }
      confirmed.delete(baseKey(bundleId));
      apply(bundleId, () => like);
    },
    onSettled: (_data, _error, { bundleId }) => {
      if (pendingFor(bundleId) > 1) return;
      void queryClient.invalidateQueries(detailFilters(bundleId));
    },
  });
};

import { isApiError } from '@app/api-core';
import {
  type InfiniteData,
  type QueryClient,
  type QueryFilters,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { isWireId, toDomainId } from '@/shared/api/ids';
import { sharedKeys } from '@/shared/query/keys';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { FeedPage } from '../model/feed';
import { setBundleLike } from '../api/like';
import { FEED_MESSAGES } from '../constants/messages';
import { patchDetailLike, patchFeedLike, toggledLike, type LikeState } from '../lib/likeCache';
import { feedKeys } from './keys';

/** viewerId: 누른 시점의 화면 명의(요청 중 명의가 바뀌어도 그 요청의 캐시만 다룸) */
export type LikeVariables = { bundleId: string; liked: boolean; viewerId: string | null };
// 캐시마다 되돌릴 값(피드 카드와 상세가 어긋나 있어도 각자 누르기 전 값으로)
type LikeBase = { feed: LikeState | undefined; detail: LikeState | undefined };

const LIKE_KEY = ['bundle-like'] as const;
// 같은 scope의 요청은 순서대로 하나씩 보냄(연타해도 서버에 마지막 누른 값이 남음)
const LIKE_SCOPE = { id: 'bundle-like' };
// 연달아 누르는 동안 되돌릴 기준(첫 요청 직전 값, 앞선 요청이 성공하면 그 응답)을 명의·번들마다 보관
const confirmed = new Map<string, LikeBase>();

const baseKey = ({ viewerId, bundleId }: LikeVariables) => `${viewerId ?? '-'}:${bundleId}`;
const feedFilters = ({ viewerId }: LikeVariables): QueryFilters => ({
  queryKey: feedKeys.list(viewerId),
  exact: true,
});
// 어느 번치 주소로 열었든 그 명의의 이 번들 상세
const detailFilters = ({ viewerId, bundleId }: LikeVariables): QueryFilters => ({
  queryKey: feedKeys.details(bundleId, viewerId),
});

const applyFeed = (client: QueryClient, vars: LikeVariables, next: (_: LikeState) => LikeState) =>
  client.setQueriesData<InfiniteData<FeedPage>>(feedFilters(vars), (data) =>
    patchFeedLike(data, vars.bundleId, next),
  );
const applyDetail = (client: QueryClient, vars: LikeVariables, next: (_: LikeState) => LikeState) =>
  client.setQueriesData<BundleDetailResponse>(detailFilters(vars), (data) =>
    patchDetailLike(data, vars.bundleId, next),
  );

const pick = (source: LikeState | undefined): LikeState | undefined =>
  source && { likedByCurrentBunch: source.likedByCurrentBunch, likeCount: source.likeCount };

/** 캐시마다 그 번들의 지금 좋아요 */
const read = (client: QueryClient, vars: LikeVariables): LikeBase => ({
  feed: pick(
    client
      .getQueriesData<InfiniteData<FeedPage>>(feedFilters(vars))
      .flatMap(([, data]) => data?.pages ?? [])
      .flatMap((page) => page.items)
      .flatMap((item) =>
        'bundle' in item && toDomainId(item.bundle.id) === vars.bundleId ? [item.bundle] : [],
      )[0],
  ),
  detail: pick(
    client.getQueriesData<BundleDetailResponse>(detailFilters(vars)).find(([, data]) => data)?.[1],
  ),
});

/** 같은 명의·번들로 아직 끝나지 않은 요청 수 */
const pendingFor = (client: QueryClient, vars: LikeVariables) =>
  client.isMutating({
    mutationKey: LIKE_KEY,
    predicate: (mutation) => {
      const other = mutation.state.variables as LikeVariables | undefined;
      return other?.bundleId === vars.bundleId && other.viewerId === vars.viewerId;
    },
  });

/**
 * 번들 좋아요(지금 번치 명의, 명세 011·012). 누르면 피드 카드·상세 캐시를 바로 바꾸고 서버에 보냄
 * 마지막 요청이 실패하면 그 번들의 좋아요만 캐시마다 기준값으로 되돌리고 공통 토스트(`meta.errorMessage`), 앞선 결과는 뒤에 누른 값을 덮지 않음
 * 피드 목록은 쪽 전부를 다시 받지 않도록 성공 응답 값으로 확정하고, 상세만 다시 받음(docs/architecture/data-layer.md 예외)
 */
export const useBundleLikeMutation = () => {
  const queryClient = useQueryClient();
  const invalidateViewer = () => {
    void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
    void queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
  };

  return useMutation({
    mutationKey: LIKE_KEY,
    scope: LIKE_SCOPE,
    mutationFn: ({ bundleId, liked }: LikeVariables) => setBundleLike(bundleId, liked),
    meta: { errorMessage: FEED_MESSAGES.likeFailed },
    onMutate: async (vars) => {
      await Promise.all([
        queryClient.cancelQueries(feedFilters(vars)),
        queryClient.cancelQueries(detailFilters(vars)),
      ]);
      // 연달아 누른 첫 요청이면 누르기 전 값을 되돌릴 기준으로 남김
      if (!confirmed.has(baseKey(vars))) confirmed.set(baseKey(vars), read(queryClient, vars));
      const next = (like: LikeState) => toggledLike(like, vars.liked);
      applyFeed(queryClient, vars, next);
      applyDetail(queryClient, vars, next);
    },
    onError: (error, vars) => {
      if (pendingFor(queryClient, vars) > 1) return;
      const base = confirmed.get(baseKey(vars));
      confirmed.delete(baseKey(vars));
      if (base?.feed) applyFeed(queryClient, vars, () => base.feed!);
      if (base?.detail) applyDetail(queryClient, vars, () => base.detail!);
      // 권한·차단·삭제·번치 상태(403·404·409)는 화면의 전제가 낡은 것이라 명의와 피드를 다시 받음
      if (isApiError(error) && [403, 404, 409].includes(error.status ?? 0)) invalidateViewer();
    },
    onSuccess: (saved, vars) => {
      const pending = pendingFor(queryClient, vars);
      // 서버의 지금 번치가 화면 명의와 다르면(다른 기기에서 전환) 명의와 목록을 다시 받음
      if (
        (saved.currentBunchId == null ? null : toDomainId(saved.currentBunchId)) !==
        (vars.viewerId && isWireId(vars.viewerId) ? vars.viewerId : null)
      ) {
        // 뒤 요청이 남았으면 그 요청이 실패할 때 쓸 기준값은 남겨 둠
        if (pending <= 1) confirmed.delete(baseKey(vars));
        invalidateViewer();
        return;
      }
      const like = { likedByCurrentBunch: saved.likedByCurrentBunch, likeCount: saved.likeCount };
      // 뒤 요청이 남았으면 화면은 그대로 두고, 그 요청이 실패할 때 되돌릴 기준만 이 응답으로
      if (pending > 1) {
        confirmed.set(baseKey(vars), { feed: like, detail: like });
        return;
      }
      confirmed.delete(baseKey(vars));
      applyFeed(queryClient, vars, () => like);
      applyDetail(queryClient, vars, () => like);
    },
    onSettled: (_data, _error, vars) => {
      if (pendingFor(queryClient, vars) > 1) return;
      void queryClient.invalidateQueries(detailFilters(vars));
    },
  });
};

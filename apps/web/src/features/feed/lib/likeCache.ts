import type { InfiniteData } from '@tanstack/react-query';
import { toDomainId } from '@/shared/api/ids';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { FeedPage } from '../model/feed';

export type LikeState = { likedByCurrentBunch: boolean; likeCount: number };

/** 누른 뒤 보일 좋아요(이미 그 상태면 그대로) */
export const toggledLike = (current: LikeState, liked: boolean): LikeState =>
  current.likedByCurrentBunch === liked
    ? current
    : { likedByCurrentBunch: liked, likeCount: Math.max(0, current.likeCount + (liked ? 1 : -1)) };

/** 피드 목록 캐시(쪽 단위)에서 그 번들 카드의 좋아요만 바꿈 */
export const patchFeedLike = (
  data: InfiniteData<FeedPage> | undefined,
  bundleId: string,
  next: (_current: LikeState) => LikeState,
): InfiniteData<FeedPage> | undefined =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        'bundle' in item && toDomainId(item.bundle.id) === bundleId
          ? { ...item, bundle: { ...item.bundle, ...next(item.bundle) } }
          : item,
      ),
    })),
  };

/** 번들 상세 캐시의 좋아요를 바꿈(다른 번들이면 그대로) */
export const patchDetailLike = (
  data: BundleDetailResponse | undefined,
  bundleId: string,
  next: (_current: LikeState) => LikeState,
): BundleDetailResponse | undefined =>
  data && toDomainId(data.id) === bundleId ? { ...data, ...next(data) } : data;

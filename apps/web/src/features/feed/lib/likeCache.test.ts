import { describe, expect, it } from 'vitest';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { FeedPage } from '../model/feed';
import { patchDetailLike, patchFeedLike, toggledLike } from './likeCache';

const like = { likedByCurrentBunch: true, likeCount: 2 };

describe('toggledLike', () => {
  it('바꾸면 수를 하나 올리거나 내리고, 이미 그 상태면 그대로', () => {
    expect(toggledLike(like, false)).toEqual({ likedByCurrentBunch: false, likeCount: 1 });
    expect(toggledLike({ likedByCurrentBunch: false, likeCount: 1 }, true)).toEqual(like);
    expect(toggledLike(like, true)).toBe(like);
  });

  it('수는 0 아래로 내려가지 않는다', () => {
    expect(toggledLike({ likedByCurrentBunch: true, likeCount: 0 }, false).likeCount).toBe(0);
  });
});

describe('patchFeedLike·patchDetailLike', () => {
  const card = (id: number) => ({ type: 'BUNDLE' as const, bundle: { id, ...like } });
  const feed = {
    pages: [{ items: [card(1), { type: 'ADVERTISEMENT' }] }, { items: [card(2)] }],
    pageParams: [undefined, 'next'],
  } as unknown as Parameters<typeof patchFeedLike>[0];
  const off = () => ({ likedByCurrentBunch: false, likeCount: 0 });

  it('피드는 여러 쪽에서 그 번들 카드만 바꾼다', () => {
    const next = patchFeedLike(feed, 2, off)!;
    const bundles = next.pages.flatMap((page: FeedPage) =>
      page.items.flatMap((item) => ('bundle' in item ? [item.bundle] : [])),
    );
    expect(bundles.map((bundle) => bundle.likedByCurrentBunch)).toEqual([true, false]);
    expect(next.pageParams).toEqual([undefined, 'next']);
  });

  it('상세는 같은 번들일 때만 바꾸고, 캐시가 없으면 그대로 없다', () => {
    const detail = { id: 5, ...like } as BundleDetailResponse;
    expect(patchDetailLike(detail, 5, off)).toMatchObject({ likedByCurrentBunch: false });
    expect(patchDetailLike(detail, 6, off)).toBe(detail);
    expect(patchDetailLike(undefined, 5, off)).toBeUndefined();
    expect(patchFeedLike(undefined, 5, off)).toBeUndefined();
  });
});

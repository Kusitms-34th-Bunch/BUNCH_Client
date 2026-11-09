import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedViewer } from '../lib/types';
import { likeStore } from '../lib/likeStore';
import { useLikeToggle } from './useLikeToggle';

const bundle = { id: 'bundle-1', liked: false, likeCount: 4 };
const trip: FeedViewer = { bunchId: 'bunch-trip', name: '여행가조' };
const book: FeedViewer = { bunchId: 'bunch-book', name: '책방산책' };

beforeEach(() => {
  likeStore.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useLikeToggle', () => {
  it('누르면 좋아요와 수가 바뀌고, 다른 화면(카드·상세)도 같은 값을 본다', () => {
    const card = renderHook(() => useLikeToggle(trip));
    const detail = renderHook(() => useLikeToggle(trip));

    act(() => card.result.current.toggle(bundle));

    expect(card.result.current.isLiked(bundle)).toBe(true);
    expect(detail.result.current.isLiked(bundle)).toBe(true);
    expect(detail.result.current.likeCount(bundle)).toBe(5);
  });

  it('번치마다 따로 기억하고, 소속 번치가 없으면 받은 값을 그대로 보인다', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useLikeToggle>,
      { viewer: FeedViewer }
    >(({ viewer }) => useLikeToggle(viewer), { initialProps: { viewer: trip } });
    act(() => result.current.toggle(bundle));

    rerender({ viewer: book });
    expect(result.current.isLiked(bundle)).toBe(false);
    rerender({ viewer: null });
    act(() => result.current.toggle(bundle));
    expect(result.current.isLiked(bundle)).toBe(false);
    rerender({ viewer: trip });
    expect(result.current.isLiked(bundle)).toBe(true);
  });

  it('빠른 둘째 탭은 무시하고, 간격을 두면 취소한다', () => {
    const { result } = renderHook(() => useLikeToggle(trip));

    act(() => result.current.toggle(bundle));
    act(() => result.current.toggle(bundle));
    expect(result.current.isLiked(bundle)).toBe(true);

    vi.advanceTimersByTime(400);
    act(() => result.current.toggle(bundle));
    expect(result.current.isLiked(bundle)).toBe(false);
    expect(result.current.likeCount(bundle)).toBe(4);
  });

  it('번치를 받기 전에는 받은 값을 그대로 보이고 눌러도 바뀌지 않는다', () => {
    const liked = { ...bundle, liked: true, likeCount: 5 };
    const { result } = renderHook(() => useLikeToggle(undefined));

    act(() => result.current.toggle(liked));

    expect(result.current.isLiked(liked)).toBe(true);
    expect(result.current.likeCount(liked)).toBe(5);
  });

  it('이미 좋아요한 번들을 취소하면 수가 1 줄고, 연타 가드는 번들마다 따로다', () => {
    const liked = { id: 'bundle-2', liked: true, likeCount: 5 };
    const { result } = renderHook(() => useLikeToggle(trip));

    act(() => result.current.toggle(liked));
    act(() => result.current.toggle(bundle));

    expect(result.current.isLiked(liked)).toBe(false);
    expect(result.current.likeCount(liked)).toBe(4);
    expect(result.current.isLiked(bundle)).toBe(true);
  });
});

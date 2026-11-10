import { useRef, useSyncExternalStore } from 'react';
import type { FeedBundle, FeedViewer } from '../lib/types';
import { likeStore } from '../lib/likeStore';

type Likeable = Pick<FeedBundle, 'id' | 'liked' | 'likeCount'>;

// 연타로 둘째 탭이 취소로 넘어가지 않게 첫 탭만 받는 간격(광고 콕하기와 같은 값)
const LIKE_TAP_GUARD_MS = 400;

/**
 * 좋아요를 화면에서만 바꿈(서버 반영·실패 되돌리기는 API 연동 단위). 피드 카드와 상세가 같은 값을 봄
 * 번치 명의라 번치마다 따로 기억하고, 소속 번치가 없거나 받기 전이면 받은 값을 그대로 보임
 */
export function useLikeToggle(viewer: FeedViewer | undefined) {
  const overrides = useSyncExternalStore(likeStore.subscribe, likeStore.read, likeStore.read);
  const lastTap = useRef<Record<string, number>>({});
  const bunchId = viewer?.bunchId;

  const isLiked = (bundle: Likeable) =>
    bunchId === undefined ? bundle.liked : (overrides.get(bunchId)?.[bundle.id] ?? bundle.liked);

  return {
    isLiked,
    likeCount: (bundle: Likeable) =>
      bundle.likeCount + (isLiked(bundle) === bundle.liked ? 0 : isLiked(bundle) ? 1 : -1),
    toggle: (bundle: Likeable) => {
      if (bunchId === undefined) return;
      const now = Date.now();
      if (now - (lastTap.current[bundle.id] ?? 0) < LIKE_TAP_GUARD_MS) return;
      lastTap.current[bundle.id] = now;
      likeStore.set(bunchId, bundle.id, !isLiked(bundle));
    },
  };
}

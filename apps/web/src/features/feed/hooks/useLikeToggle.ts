import { useRef } from 'react';
import { toWireId } from '@/shared/api/ids';
import type { FeedBundle, FeedViewer } from '../lib/types';
import { useBundleLikeMutation } from '../queries/like';

// 연타로 둘째 탭이 취소로 넘어가지 않게 첫 탭만 받는 간격(광고 콕하기와 같은 값)
const LIKE_TAP_GUARD_MS = 400;

/**
 * 하트를 누르면 지금 번치 명의로 좋아요를 바꿈. 보이는 값은 피드·상세 캐시(낙관적 반영)
 * 소속 번치가 없거나 받기 전이면 무시(안내는 호출하는 쪽의 `asBunch`)
 */
export function useLikeToggle(viewer: FeedViewer | undefined) {
  const like = useBundleLikeMutation(viewer === undefined ? undefined : (viewer?.bunchId ?? null));
  const lastTap = useRef<Record<string, number>>({});

  return {
    toggle: (bundle: Pick<FeedBundle, 'id' | 'liked'>) => {
      const bundleId = toWireId(bundle.id);
      if (!viewer || bundleId === undefined) return;
      const now = Date.now();
      if (now - (lastTap.current[bundle.id] ?? 0) < LIKE_TAP_GUARD_MS) return;
      lastTap.current[bundle.id] = now;
      like.mutate({ bundleId, liked: !bundle.liked });
    },
  };
}

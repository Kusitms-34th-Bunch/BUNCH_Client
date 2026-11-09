import { useState } from 'react';
import type { FeedBundle, FeedViewer } from '../lib/types';

type Likeable = Pick<FeedBundle, 'id' | 'liked' | 'likeCount'>;

/** 좋아요를 화면에서만 바꿈(서버 반영·되돌리기는 구현 단위 3). 소속 번치가 없으면 바꾼 값을 보이지 않음 */
export function useLikeToggle(viewer: FeedViewer | undefined) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const isLiked = (bundle: Likeable) =>
    viewer === null ? bundle.liked : (liked[bundle.id] ?? bundle.liked);

  return {
    isLiked,
    likeCount: (bundle: Likeable) =>
      bundle.likeCount + (isLiked(bundle) === bundle.liked ? 0 : isLiked(bundle) ? 1 : -1),
    toggle: (bundle: Likeable) =>
      setLiked((current) => ({ ...current, [bundle.id]: !(current[bundle.id] ?? bundle.liked) })),
  };
}

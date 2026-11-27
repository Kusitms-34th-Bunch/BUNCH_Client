import { isApiError } from '@app/api-core';
import { useRef, useState } from 'react';
import { useRestartFeed } from '../queries/feed';

/** 커서로 이어 받을 수 없는 실패(문맥이 바뀜 FEED_001, 커서 오류 400). size는 고정이라 400은 커서 쪽 */
const cannotContinue = (error: unknown) =>
  isApiError(error) && (error.code === 'FEED_001' || error.status === 400);

type FeedNextPage = {
  fetchNextPage: () => Promise<{ error: unknown; isFetchNextPageError: boolean }>;
  isFetchNextPageError: boolean;
  error: unknown;
};

/**
 * 다음 쪽 이어 받기. 이어 받을 수 없는 실패면 처음부터 다시 받음
 * `staleCursor`는 그 실패로 멈춘 상태, `restarting`은 저절로 다시 받는 중
 */
export function useFeedLoadMore(feed: FeedNextPage, viewerId: string | null | undefined) {
  const { fetchNextPage } = feed;
  // 번치·팔로우가 그사이 바뀌었거나(FEED_001) 커서가 맞지 않으면(400) 이어 받을 수 없어 처음부터 다시 받음
  // 저절로는 연달아 한 번만 하고, 또 실패하면 「다시 시도」로 넘김(같은 실패가 반복돼도 멈추게)
  // 다음 쪽을 받아야 다시 쓸 수 있음. 첫 쪽 성공으로 풀면 재시작 → 첫 쪽 → 실패가 되풀이됨
  const restart = useRestartFeed(viewerId);
  const [restartUsed, setRestartUsed] = useState(false);
  // loadMore는 감지 요소가 붙는 순간(commit 중) 지난 렌더의 함수로 불릴 수 있어 가드는 ref로 읽음
  const restartUsedRef = useRef(false);
  const markRestartUsed = (used: boolean) => {
    restartUsedRef.current = used;
    setRestartUsed(used);
  };
  const staleCursor = feed.isFetchNextPageError && cannotContinue(feed.error);
  const restarting = staleCursor && !restartUsed;
  const loadMore = async () => {
    const result = await fetchNextPage();
    const stale = cannotContinue(result.error);
    if (!result.isFetchNextPageError) markRestartUsed(false);
    else if (stale && !restartUsedRef.current) {
      markRestartUsed(true);
      await restart();
    }
  };

  return { loadMore, restart, staleCursor, restarting };
}

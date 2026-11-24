'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isNativeShell, openTabPath } from '@/shared/bridge/client';
import { useRefreshActiveQueries } from '@/shared/query/useRefreshActiveQueries';
import { useFeedLoadMore } from '../hooks/useFeedLoadMore';
import { useFeedUnreadNotifications } from '../hooks/useFeedUnreadNotifications';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { useOpenBundleDetail } from '../hooks/useOpenBundleDetail';
import { feedQueryOptions } from '../queries/feed';
import { FeedScreen } from './FeedScreen';

type FeedProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
  /** 번들 상세가 쓰는 번치 정보를 미리 받음(다른 기능의 query라 route가 조합) */
  prefetchBunch?: ((_bunchId: string, _viewerId: string | null) => Promise<unknown>) | undefined;
};

/** 피드 탭 화면과 피드·내 정보·좋아요 API를 잇는 컨테이너 */
export function Feed({ links, prefetchBunch }: FeedProps) {
  const router = useRouter();
  const { viewer, viewerPending, viewerFailed, retryViewer, asBunch } = useFeedViewer();
  const hasUnreadNotifications = useFeedUnreadNotifications(viewer);
  const refresh = useRefreshActiveQueries();
  const likes = useLikeToggle(viewer);

  // 구간·좋아요 상태는 지금 번치 명의로 정해짐(소속 번치가 없으면 공개 구간만, 기능명세서 6.1.7)
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const feed = useInfiniteQuery(feedQueryOptions(viewerId));
  const { prefetch: prefetchDetail, open: openDetail } = useOpenBundleDetail({
    viewerId,
    prefetchBunch,
  });
  const { loadMore, restart, staleCursor, restarting } = useFeedLoadMore(feed, viewerId);
  // 내 정보를 못 받으면 명의를 몰라 피드도 받을 수 없으므로 같은 실패로 보임
  const firstFailed =
    feed.data === undefined && (feed.isError || (viewer === undefined && viewerFailed));
  // 다시 시도 중에도 버튼을 남겨 초점을 잃지 않게 함(누르는 동안은 막음)
  const [retrying, setRetrying] = useState(false);

  return (
    <FeedScreen
      links={links}
      viewer={viewer}
      viewerPending={viewerPending}
      hasUnreadNotifications={hasUnreadNotifications}
      pages={feed.data?.pages}
      fetching={feed.isFetching}
      hasNextPage={feed.hasNextPage}
      fetchingNextPage={feed.isFetchingNextPage}
      nextPageFailed={feed.isFetchNextPageError}
      firstFailed={firstFailed}
      staleCursor={staleCursor}
      restarting={restarting}
      retrying={retrying}
      onRetry={(run) => {
        setRetrying(true);
        void run().finally(() => setRetrying(false));
      }}
      onRefresh={refresh}
      onRetryFirst={() => (feed.isError ? feed.refetch() : retryViewer())}
      onLoadMore={loadMore}
      onRestart={restart}
      openDetail={openDetail}
      prefetchDetail={prefetchDetail}
      onLike={(bundle) => asBunch(() => likes.toggle(bundle))}
      // iOS 쉘은 탭마다 WebView라 번치 탭으로 전환(6.1.2 상세 동작 3). 브라우저는 링크 그대로
      onBunchHomeClick={(event) => {
        if (!isNativeShell()) return;
        event.preventDefault();
        openTabPath(links.bunchHome, (href) => router.push(href));
      }}
    />
  );
}

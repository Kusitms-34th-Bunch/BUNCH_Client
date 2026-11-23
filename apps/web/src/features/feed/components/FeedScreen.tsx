'use client';

import { Button } from '@app/design-system';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from 'react-simplikit';
import { isNativeShell, openTabPath } from '@/shared/bridge/client';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useHoldScrollOnLeave } from '@/shared/hooks/useHoldScrollOnLeave';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useScrollInHistory } from '@/shared/hooks/useScrollInHistory';
import { useRefreshActiveQueries } from '@/shared/query/useRefreshActiveQueries';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useBundleSheets } from '../hooks/useBundleSheets';
import { useClientNow } from '../hooks/useClientNow';
import { useFeedLoadMore } from '../hooks/useFeedLoadMore';
import { useFeedUnreadNotifications } from '../hooks/useFeedUnreadNotifications';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { useOpenBundleDetail } from '../hooks/useOpenBundleDetail';
import { readHiddenAds } from '../lib/hiddenAds';
import { type FeedEntry, splitFeedSections, toFeedEntries } from '../model/feed';
import { feedQueryOptions } from '../queries/feed';
import { FeedAdCard } from './FeedAdCard';
import { FeedBundleItem } from './FeedBundleItem';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';
import { FeedListSkeleton } from './FeedSkeleton';

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
  /** 번들 상세가 쓰는 번치 정보를 미리 받음(다른 기능의 query라 route가 조합) */
  prefetchBunch?: ((_bunchId: string, _viewerId: string | null) => Promise<unknown>) | undefined;
};

/** 목록의 index번째 카드 첫 버튼으로 초점(없으면 이어 받기 자리나 끝 안내) */
const focusListItem = (
  container: HTMLElement | null,
  index: number,
  fallbacks: readonly (HTMLElement | null)[],
) => {
  const items = container?.querySelectorAll(':scope > ul > li');
  const target =
    items?.[index]?.querySelector<HTMLElement>('button, a[href]') ??
    fallbacks.find((element) => element !== null);
  target?.focus({ preventScroll: true });
};

/**
 * 피드 탭(기능명세서 6.1, Figma `4940:99466`): 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내
 * 서버(`GET /feed`)가 정한 순서대로 그리고, 끝에 닿으면 다음 쪽을 이어서 받음
 */
export function FeedScreen({ links, prefetchBunch }: FeedScreenProps) {
  const router = useRouter();
  const { viewer, viewerPending, viewerFailed, retryViewer, asBunch } = useFeedViewer();
  const hasUnreadNotifications = useFeedUnreadNotifications(viewer);
  const reducedMotion = useReducedMotion();
  const refresh = useRefreshActiveQueries();
  const topRef = useRef<HTMLDivElement>(null);
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  const likes = useLikeToggle(viewer);
  const { openPlaces, openMembers } = useBundleSheets();

  // 구간·좋아요 상태는 지금 번치 명의로 정해짐(소속 번치가 없으면 공개 구간만, 기능명세서 6.1.7)
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const feed = useInfiniteQuery(feedQueryOptions(viewerId));
  const { prefetch: prefetchDetail, open: openDetail } = useOpenBundleDetail({
    viewerId,
    prefetchBunch,
  });

  useScrollInHistory(topRef, feed.data !== undefined);
  useHoldScrollOnLeave(topRef);
  const { hasNextPage, isFetchingNextPage } = feed;
  const { loadMore, restart, staleCursor, restarting } = useFeedLoadMore(feed, viewerId);

  // 다시 시도 중에도 버튼을 남겨 초점을 잃지 않게 함(누르는 동안은 막음)
  const [retrying, setRetrying] = useState(false);
  // 끝난 뒤 초점을 옮길 카드 순번(이어 받기는 누르기 전 카드 수, 처음부터 다시 받기는 0)
  const focusAfterRetry = useRef<number | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const retry = (run: () => Promise<unknown>, fromStart = false) => {
    if (retrying) return;
    focusAfterRetry.current = fromStart
      ? 0
      : (topRef.current?.querySelectorAll(':scope > ul > li').length ?? 0);
    setRetrying(true);
    void run().finally(() => setRetrying(false));
  };
  // 성공해 버튼이 사라진 렌더 뒤에 초점을 새로 받은 첫 카드로(실패면 버튼에 남아 그대로)
  // 내 정보 뒤 이어지는 피드 요청은 그 렌더에서 이미 받는 중(isFetching)으로 잡혀 끝날 때까지 기다림
  useLayoutEffect(() => {
    const index = focusAfterRetry.current;
    if (index === null || retrying || feed.isFetching) return;
    focusAfterRetry.current = null;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    // 카드가 없으면 다시 나타난 「다시 시도」, 이어 받기 자리, 끝 안내, 화면 제목 순
    focusListItem(topRef.current, index, [
      retryButtonRef.current,
      moreRef.current,
      endRef.current,
      titleRef.current,
    ]);
  });
  // 내 정보를 못 받으면 명의를 몰라 피드도 받을 수 없으므로 같은 실패로 보임
  const firstFailed =
    feed.data === undefined && (feed.isError || (viewer === undefined && viewerFailed));

  // 숨긴 광고는 안내를 잠깐 보인 뒤 접혀 사라지고, 피드에 다시 들어와도 없음
  const [hiddenAds, setHiddenAds] = useState(readHiddenAds);
  const endRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shown = (entry: FeedEntry) => (entry.kind === 'ad' ? !hiddenAds.has(entry.ad.id) : true);
  const entries = feed.data ? toFeedEntries(feed.data.pages).filter(shown) : [];
  const { following, followingDone, rest } = splitFeedSections(entries);
  const handleAdGone = useCallback((adId: string, hadFocus: boolean) => {
    // 초점이 있던 카드가 없어지므로 다음 카드로 옮김(없으면 이어 받기 자리나 끝 안내)
    if (hadFocus) {
      const items = [...(topRef.current?.querySelectorAll(':scope > ul > li') ?? [])];
      const at = items.findIndex((item) => item.contains(document.activeElement));
      focusListItem(topRef.current, at < 0 ? items.length : at + 1, [
        moreRef.current,
        endRef.current,
      ]);
    }
    setHiddenAds((current) => new Set(current).add(adId));
  }, []);

  // 목록 끝 1.5화면 전에 다음 쪽(실패해 멈춘 동안은 「다시 시도」로만). 감지 요소는 받을 수 있을 때만 그려 붙는 순간 보이면 바로 받음
  // 첫 쪽을 다시 받는 동안(저장본 복원 직후 등)은 기다림: 이어 받기가 그 요청을 취소하고 옛 커서로 받지 않게
  const canLoadMore = hasNextPage && !feed.isFetching && !feed.isFetchNextPageError;
  const observeMore = useIntersectionObserver<HTMLSpanElement>((entry) => {
    if (entry.isIntersecting) void loadMore();
  }, {});

  const renderEntry = (entry: FeedEntry) => {
    if (entry.kind === 'bundle')
      return (
        <FeedBundleItem
          key={entry.bundle.id}
          bundle={entry.bundle}
          now={now}
          ownBunch={viewer?.bunchId === entry.bundle.bunch.id}
          links={links}
          openDetail={openDetail}
          prefetchDetail={prefetchDetail}
          onMembers={openMembers}
          onPlaces={openPlaces}
          onLike={(bundle) => asBunch(() => likes.toggle(bundle))}
        />
      );
    if (entry.kind === 'ad')
      return <FeedAdCard key={entry.key} ad={entry.ad} onGone={handleAdGone} />;
    return null;
  };

  // 늘 있는 상태 영역에서 글자만 바꿔 받는 중을 읽어 줌
  let statusText = '';
  if (feed.data === undefined && !firstFailed) statusText = text.feedLoading;
  else if (isFetchingNextPage) statusText = text.moreLoading;

  return (
    <PageShell
      onRefresh={refresh}
      // 내리면 헤더를 숨기고 올리면 다시 보임(A안, Facebook 방식)
      collapsibleHeader
      header={
        <FeedHeader
          viewer={viewer}
          viewerPending={viewerPending}
          onLogoClick={() =>
            topRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
          }
          notificationsHref={links.notifications}
          hasUnreadNotifications={hasUnreadNotifications}
          bunchHomeHref={links.bunchHome}
          // iOS 쉘은 탭마다 WebView라 번치 탭으로 전환(6.1.2 상세 동작 3). 브라우저는 링크 그대로
          onBunchHomeClick={(event) => {
            if (!isNativeShell()) return;
            event.preventDefault();
            openTabPath(links.bunchHome, (href) => router.push(href));
          }}
        />
      }
    >
      <div ref={topRef} className="pt-padding-p8">
        <h1 ref={titleRef} tabIndex={-1} className="sr-only">
          {text.title}
        </h1>
        {feed.data === undefined && (firstFailed || retrying) ? (
          <div className="gap-s8 px-s8 py-s16 flex flex-col items-center">
            {firstFailed ? (
              <p
                role="alert"
                className="typography-body-3-semibold text-text-secondary text-center"
              >
                {text.actionFailed}
              </p>
            ) : null}
            <Button
              ref={retryButtonRef}
              variant="tertiary"
              size="md"
              aria-disabled={retrying}
              onClick={() => retry(() => (feed.isError ? feed.refetch() : retryViewer()))}
            >
              {text.retry}
            </Button>
          </div>
        ) : null}
        {/* 첫 쪽을 받는 중(캐시가 있으면 이전 목록을 그대로 보임) */}
        {feed.data === undefined && !firstFailed && !retrying ? <FeedListSkeleton /> : null}
        {following.length > 0 ? (
          <>
            <ul className="px-padding-p8 gap-s14 flex flex-col">{following.map(renderEntry)}</ul>
            {followingDone ? <FeedCaughtUp kind="following" /> : null}
          </>
        ) : null}
        {rest.length > 0 ? (
          <ul className="px-padding-p8 gap-s14 flex flex-col">{rest.map(renderEntry)}</ul>
        ) : null}
        {hasNextPage ? (
          // 광고가 사라질 때 다음 카드가 없으면 초점을 받는 자리
          <div
            ref={moreRef}
            tabIndex={-1}
            role="group"
            aria-label={text.moreArea}
            className="gap-s8 py-s8 relative flex flex-col items-center outline-none"
          >
            {/* absolute라 flex 간격에 끼지 않음. 위로 1.5화면 길게 그려 끝에 닿기 전에 미리 받음(스크롤 영역이 PageShell 안이라 rootMargin은 안 먹음) */}
            {canLoadMore ? (
              <span
                ref={observeMore}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 h-[150svh] w-px -translate-y-full"
              />
            ) : null}
            {(feed.isFetchNextPageError && !restarting) || retrying ? (
              <>
                {feed.isFetchNextPageError ? (
                  <p
                    role="alert"
                    className="typography-body-3-semibold text-text-secondary text-center"
                  >
                    {text.moreFailed}
                  </p>
                ) : null}
                <Button
                  ref={retryButtonRef}
                  variant="tertiary"
                  size="md"
                  aria-disabled={retrying}
                  onClick={() => (staleCursor ? retry(restart, true) : retry(loadMore))}
                >
                  {text.retry}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        <p role="status" className="sr-only">
          {statusText}
        </p>
        {feed.data !== undefined && !hasNextPage ? (
          <div
            ref={endRef}
            tabIndex={-1}
            role="group"
            aria-label={text.allDone}
            className="outline-none"
          >
            <FeedCaughtUp kind="all" />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

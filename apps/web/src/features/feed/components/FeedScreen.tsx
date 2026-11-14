'use client';

import { isApiError } from '@app/api-core';
import { Button } from '@app/design-system';
import { FeedBundleCard } from '@app/design-system/web';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import { useRefreshActiveQueries } from '@/shared/query/useRefreshActiveQueries';
import type { FeedBundle } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { useBundleEdits } from '../hooks/useBundleEdits';
import { useBundleSheets } from '../hooks/useBundleSheets';
import { useClientNow } from '../hooks/useClientNow';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { useHoldScrollOnLeave } from '../hooks/useHoldScrollOnLeave';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { useScrollInHistory } from '../hooks/useScrollInHistory';
import { hideLeftMemberImages } from '../lib/deletedUserImage';
import { readHiddenAds } from '../lib/hiddenAds';
import { type FeedEntry, toFeedEntries } from '../model/feed';
import { feedQueryOptions, useRestartFeed } from '../queries/feed';
import { FeedAdCard } from './FeedAdCard';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
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
export function FeedScreen({ links }: FeedScreenProps) {
  const router = useRouter();
  const { viewer, viewerPending, viewerFailed, retryViewer, asBunch } = useFeedViewer();
  const reducedMotion = useReducedMotion();
  const refresh = useRefreshActiveQueries();
  const topRef = useRef<HTMLDivElement>(null);
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  const likes = useLikeToggle(viewer);
  const { openPlaces, openMembers } = useBundleSheets();

  useScrollInHistory(topRef);
  useHoldScrollOnLeave(topRef);

  // 구간·좋아요 상태는 지금 번치 명의로 정해짐(소속 번치가 없으면 공개 구간만, 기능명세서 6.1.7)
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const feed = useInfiniteQuery(feedQueryOptions(viewerId));
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  // 번치·팔로우가 그사이 바뀌면(FEED_001) 커서를 이어 쓸 수 없어 처음부터 다시 받음
  // 저절로는 연달아 한 번만 하고, 또 실패하면 「다시 시도」로 넘김(같은 실패가 반복돼도 멈추게)
  // 다음 쪽을 받아야 다시 쓸 수 있음. 첫 쪽 성공으로 풀면 재시작 → 첫 쪽 → FEED_001이 되풀이됨
  const restart = useRestartFeed(viewerId);
  const [restartUsed, setRestartUsed] = useState(false);
  const staleCursor =
    feed.isFetchNextPageError && isApiError(feed.error) && feed.error.code === 'FEED_001';
  const restarting = staleCursor && !restartUsed;
  const loadMore = useCallback(async () => {
    const result = await fetchNextPage();
    const stale = isApiError(result.error) && result.error.code === 'FEED_001';
    if (!result.isFetchNextPageError) setRestartUsed(false);
    else if (stale && !restartUsed) {
      setRestartUsed(true);
      await restart();
    }
  }, [fetchNextPage, restart, restartUsed]);

  // 다시 시도 중에도 버튼을 남겨 초점을 잃지 않게 함(누르는 동안은 막음)
  const [retrying, setRetrying] = useState(false);
  const retry = (run: () => Promise<unknown>) => {
    if (retrying) return;
    const before = topRef.current?.querySelectorAll(':scope > ul > li').length ?? 0;
    setRetrying(true);
    void run().finally(() => {
      setRetrying(false);
      // 성공해 버튼이 사라지면 초점을 새로 받은 첫 카드로
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          focusListItem(topRef.current, before, [moreRef.current, endRef.current]);
        }
      });
    });
  };
  // 내 정보를 못 받으면 명의를 몰라 피드도 받을 수 없으므로 같은 실패로 보임
  const firstFailed =
    feed.data === undefined && (feed.isError || (viewer === undefined && viewerFailed));

  // 화면에서 지웠거나 「멤버 공개」로 바꾼 번들은 피드에서 뺌(기능명세서 6.2.12 로직 5·6.2.13). 피드에는 공개 번들만 옴
  const { isDeleted, becameMemberOnly } = useBundleEdits();
  // 숨긴 광고는 안내를 잠깐 보인 뒤 접혀 사라지고, 피드에 다시 들어와도 없음
  const [hiddenAds, setHiddenAds] = useState(readHiddenAds);
  const endRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const shown = (entry: FeedEntry) =>
    entry.kind === 'bundle'
      ? !isDeleted(entry.bundle.id) && !becameMemberOnly(entry.bundle.id, false)
      : entry.kind === 'ad'
        ? !hiddenAds.has(entry.ad.id)
        : true;
  const entries = feed.data ? toFeedEntries(feed.data.pages).filter(shown) : [];
  // 카드의 구간으로 두 목록을 나눔. 구간 끝 안내가 아직 안 왔어도 팔로우 카드가 다른 목록으로 옮겨 다시 그려지지 않게
  const doneAt = entries.findIndex((entry) => entry.kind === 'followingDone');
  const splitAt =
    doneAt >= 0
      ? doneAt
      : entries.findLastIndex((entry) => entry.kind === 'bundle' && entry.segment === 'FOLLOWING') +
        1;
  const following = entries.slice(0, splitAt);
  const rest = entries.slice(splitAt).filter((entry) => entry.kind !== 'followingDone');
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

  // 목록 끝이 보이면 다음 쪽(실패해 멈춘 동안은 「다시 시도」로만)
  const canLoadMore = hasNextPage && !isFetchingNextPage && !feed.isFetchNextPageError;
  useEffect(() => {
    const element = moreRef.current;
    if (!canLoadMore || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void loadMore();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  const renderEntry = (entry: FeedEntry) =>
    entry.kind === 'bundle' ? (
      renderCard(entry.bundle)
    ) : entry.kind === 'ad' ? (
      <FeedAdCard key={entry.key} ad={entry.ad} onGone={handleAdGone} />
    ) : null;

  const renderCard = (bundle: FeedBundle) => {
    const ownBunch = viewer?.bunchId === bundle.bunch.id;
    return (
      <li key={bundle.id}>
        <FeedBundleCard
          titleAs="h2"
          bunchName={bundle.bunch.name}
          bunchImageSrc={bundle.bunch.imageSrc}
          time={now === null ? '' : formatElapsedTime(bundle.publishedAt, now)}
          onBunchClick={() =>
            router.push(ownBunch ? links.bunchHome : links.otherBunch(bundle.bunch.id))
          }
          members={hideLeftMemberImages(bundle.members)}
          onMembers={() => openMembers(bundle.members)}
          photos={bundle.photos}
          title={bundle.title}
          location={bundle.location}
          onLocationClick={() => openPlaces(bundle.places)}
          date={bundle.date}
          onPhotoClick={() => router.push(FEED_PATHS.bundle(bundle.id))}
          liked={likes.isLiked(bundle)}
          likeCount={likes.likeCount(bundle)}
          onLike={() => asBunch(() => likes.toggle(bundle))}
          commentCount={bundle.commentCount}
          onComment={() => router.push(FEED_PATHS.bundleComments(bundle.id))}
        />
      </li>
    );
  };

  return (
    <PageShell
      onRefresh={refresh}
      header={
        <FeedHeader
          viewer={viewer}
          viewerPending={viewerPending}
          onLogoClick={() =>
            topRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
          }
          notificationsHref={links.notifications}
          bunchHomeHref={links.bunchHome}
        />
      }
    >
      <div ref={topRef} className="pt-padding-p8">
        <h1 className="sr-only">{text.title}</h1>
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
              variant="tertiary"
              size="md"
              aria-disabled={retrying}
              onClick={() => retry(() => (feed.isError ? feed.refetch() : retryViewer()))}
            >
              {text.retry}
            </Button>
          </div>
        ) : null}
        {following.length > 0 ? (
          <>
            <ul className="px-padding-p8 gap-s14 flex flex-col">{following.map(renderEntry)}</ul>
            {doneAt >= 0 ? <FeedCaughtUp kind="following" /> : null}
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
            className="gap-s8 py-s8 flex flex-col items-center outline-none"
          >
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
                  variant="tertiary"
                  size="md"
                  aria-disabled={retrying}
                  onClick={() => retry(staleCursor ? restart : loadMore)}
                >
                  {text.retry}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {/* 늘 있는 상태 영역에서 글자만 바꿔 받는 중을 읽어 줌 */}
        <p role="status" className="sr-only">
          {feed.data === undefined && !firstFailed
            ? text.feedLoading
            : isFetchingNextPage
              ? text.moreLoading
              : ''}
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

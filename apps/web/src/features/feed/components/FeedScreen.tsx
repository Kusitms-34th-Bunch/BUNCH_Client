'use client';

import { Button } from '@app/design-system';
import { type MouseEvent, useCallback, useState } from 'react';
import { useIntersectionObserver } from 'react-simplikit';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useHoldScrollOnLeave } from '@/shared/hooks/scroll/useHoldScrollOnLeave';
import { useScrollInHistory } from '@/shared/hooks/scroll/useScrollInHistory';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { useOpenBundleDetail } from '../hooks/useOpenBundleDetail';
import type { FeedBundle, FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useBundleSheets } from '../hooks/useBundleSheets';
import { useClientNow } from '../hooks/useClientNow';
import { useFeedListFocus } from '../hooks/useFeedListFocus';
import { readHiddenAds } from '../lib/hiddenAds';
import { type FeedEntry, type FeedPage, splitFeedSections, toFeedEntries } from '../model/feed';
import { FeedAdCard } from './FeedAdCard';
import { FeedBundleItem } from './FeedBundleItem';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';
import { FeedListSkeleton } from './FeedSkeleton';

type BundleDetailOpener = ReturnType<typeof useOpenBundleDetail>;

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
  /** 지금 번치(받기 전 undefined, 소속 번치 없음 null) */
  viewer: FeedViewer | null | undefined;
  viewerPending: boolean;
  hasUnreadNotifications: boolean;
  /** 받은 쪽(첫 쪽을 받기 전 undefined) */
  pages: readonly FeedPage[] | undefined;
  /** 받는 중(첫 쪽·다음 쪽·다시 받기 모두) */
  fetching: boolean;
  hasNextPage: boolean;
  fetchingNextPage: boolean;
  nextPageFailed: boolean;
  /** 첫 쪽이나 내 정보를 받지 못함 */
  firstFailed: boolean;
  /** 커서가 맞지 않아 처음부터 다시 받아야 함, 그중 저절로 다시 받는 중 */
  staleCursor: boolean;
  restarting: boolean;
  /** 다시 시도 중(버튼은 남기고 누르기만 막음) */
  retrying: boolean;
  /** 다시 시도 실행(끝날 때까지 retrying). 컨테이너가 상태를 가져 끝난 렌더에 최신 받는 중 값이 함께 옴 */
  onRetry: (_run: () => Promise<unknown>) => void;
  onRefresh: () => Promise<unknown>;
  onRetryFirst: () => Promise<unknown>;
  onLoadMore: () => Promise<unknown>;
  onRestart: () => Promise<unknown>;
  openDetail: BundleDetailOpener['open'];
  prefetchDetail: BundleDetailOpener['prefetch'];
  onLike: (_bundle: FeedBundle) => void;
  onBunchHomeClick: (_event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * 피드 탭(기능명세서 6.1, Figma `4940:99466`): 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내
 * 서버(`GET /feed`)가 정한 순서대로 그리고, 끝에 닿으면 다음 쪽을 이어서 받음
 */
// 사진을 바로 받는 위쪽 카드 수(그 아래는 lazy)
const EAGER_PHOTO_CARDS = 3;

export function FeedScreen({
  links,
  viewer,
  viewerPending,
  hasUnreadNotifications,
  pages,
  fetching,
  hasNextPage,
  fetchingNextPage,
  nextPageFailed,
  firstFailed,
  staleCursor,
  restarting,
  retrying,
  onRetry,
  onRefresh,
  onRetryFirst,
  onLoadMore,
  onRestart,
  openDetail,
  prefetchDetail,
  onLike,
  onBunchHomeClick,
}: FeedScreenProps) {
  const reducedMotion = useReducedMotion();
  const { topRef, endRef, moreRef, titleRef, retryButtonRef, retry, focusNextOfFocused } =
    useFeedListFocus({ retrying, fetching, onRetry });
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  const { openPlaces, openMembers } = useBundleSheets();

  useScrollInHistory(topRef, pages !== undefined);
  useHoldScrollOnLeave(topRef);

  // 숨긴 광고는 안내를 잠깐 보인 뒤 접혀 사라지고, 피드에 다시 들어와도 없음
  const [hiddenAds, setHiddenAds] = useState(readHiddenAds);
  const shown = (entry: FeedEntry) => (entry.kind === 'ad' ? !hiddenAds.has(entry.ad.id) : true);
  const entries = pages ? toFeedEntries(pages).filter(shown) : [];
  const { following, followingDone, rest } = splitFeedSections(entries);
  // 위 3장은 사진을 바로 받고(맨 위는 우선순위까지), 그 아래는 다가올 때(첫 화면에 10장을 한꺼번에 받지 않게, #534)
  // 3장까지 바로 받는 이유: iOS WebView는 lazy를 미리 받는 거리가 짧아 빠르게 내리면 바로 아래 사진이 잠깐 빔
  const eagerBundleIds = [...following, ...rest]
    .flatMap((entry) => (entry.kind === 'bundle' ? [entry.bundle.id] : []))
    .slice(0, EAGER_PHOTO_CARDS);
  const handleAdGone = useCallback(
    (adId: string, hadFocus: boolean) => {
      if (hadFocus) focusNextOfFocused();
      setHiddenAds((current) => new Set(current).add(adId));
    },
    [focusNextOfFocused],
  );

  // 목록 끝 1.5화면 전에 다음 쪽(실패해 멈춘 동안은 「다시 시도」로만). 감지 요소는 받을 수 있을 때만 그려 붙는 순간 보이면 바로 받음
  // 첫 쪽을 다시 받는 동안(저장본 복원 직후 등)은 기다림: 이어 받기가 그 요청을 취소하고 옛 커서로 받지 않게
  const canLoadMore = hasNextPage && !fetching && !nextPageFailed;
  const observeMore = useIntersectionObserver<HTMLSpanElement>((entry) => {
    if (entry.isIntersecting) void onLoadMore();
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
          onLike={onLike}
          photoPriority={
            entry.bundle.id === eagerBundleIds[0]
              ? true
              : eagerBundleIds.includes(entry.bundle.id)
                ? undefined
                : false
          }
        />
      );
    if (entry.kind === 'ad')
      return <FeedAdCard key={entry.key} ad={entry.ad} onGone={handleAdGone} />;
    return null;
  };

  // 늘 있는 상태 영역에서 글자만 바꿔 받는 중을 읽어 줌
  let statusText = '';
  if (pages === undefined && !firstFailed) statusText = text.feedLoading;
  else if (fetchingNextPage) statusText = text.moreLoading;

  return (
    <PageShell
      onRefresh={onRefresh}
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
          onBunchHomeClick={onBunchHomeClick}
        />
      }
    >
      <div ref={topRef} className="pt-padding-p8">
        <h1 ref={titleRef} tabIndex={-1} className="sr-only">
          {text.title}
        </h1>
        {pages === undefined && (firstFailed || retrying) ? (
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
              onClick={() => retry(onRetryFirst)}
            >
              {text.retry}
            </Button>
          </div>
        ) : null}
        {/* 첫 쪽을 받는 중(캐시가 있으면 이전 목록을 그대로 보임) */}
        {pages === undefined && !firstFailed && !retrying ? <FeedListSkeleton /> : null}
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
            {(nextPageFailed && !restarting) || retrying ? (
              <>
                {nextPageFailed ? (
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
                  onClick={() => (staleCursor ? retry(onRestart, true) : retry(onLoadMore))}
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
        {pages !== undefined && !hasNextPage ? (
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

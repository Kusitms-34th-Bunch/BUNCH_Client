'use client';

import { FeedBundleCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { FeedBundle } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { feedFixture } from '../fixtures/feed.fixture';
import { useClientNow } from '../hooks/useClientNow';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { formatElapsedTime } from '../lib/elapsedTime';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
};

// 스크롤은 페이지 안 main이 맡아 SSGOI가 복원하지 않으므로 이 피드의 history 항목에 저장(뒤로 왔을 때만 복원됨)
// 나가는 화면은 DOM에 다시 붙으며 스크롤이 0이 되어 맨 위로 튀므로 스크롤을 transform으로 옮겨 둠
const holdScroll = (content: HTMLElement | null) => {
  const main = content?.closest('main');
  // 이동을 기다리는 사이 다시 눌러도 저장한 값 유지
  if (!content || !main || content.style.transform) return;
  const state = window.history.state as object | null;
  window.history.replaceState({ ...state, feedScroll: main.scrollTop }, '');
  content.style.transform = `translateY(${-main.scrollTop}px)`;
  main.scrollTop = 0;
};

const restoreScroll = (content: HTMLElement | null) => {
  const main = content?.closest('main');
  const state = window.history.state as { feedScroll?: number } | null;
  if (main && state?.feedScroll) main.scrollTop = state.feedScroll;
};

/**
 * 피드 탭(기능명세서 6.1, Figma `4940:99466`): 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내
 * API 연결 전 fixture. 당겨서 새로고침·이어서 불러오기·광고 카드는 각 구현 단위에서 추가
 */
export function FeedScreen({ links }: FeedScreenProps) {
  const router = useRouter();
  const { viewer, viewerPending, asBunch } = useFeedViewer();
  const reducedMotion = useReducedMotion();
  const topRef = useRef<HTMLDivElement>(null);
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  const likes = useLikeToggle(viewer);

  useLayoutEffect(() => restoreScroll(topRef.current), []);

  const openBundle = (path: string) => {
    holdScroll(topRef.current);
    router.push(path);
  };

  // 소속 번치가 없으면 공개 구간만(기능명세서 6.1.7)
  const following = viewer === null ? [] : feedFixture.following;
  const publicBundles = feedFixture.public;

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
          members={bundle.members}
          photos={bundle.photos}
          title={bundle.title}
          location={bundle.location}
          date={bundle.date}
          onPhotoClick={() => openBundle(FEED_PATHS.bundle(bundle.id))}
          liked={likes.isLiked(bundle)}
          likeCount={likes.likeCount(bundle)}
          onLike={() => asBunch(() => likes.toggle(bundle))}
          commentCount={bundle.commentCount}
          onComment={() => openBundle(FEED_PATHS.bundleComments(bundle.id))}
        />
      </li>
    );
  };

  return (
    <PageShell
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
        {following.length > 0 ? (
          <>
            <ul className="px-padding-p8 gap-s14 flex flex-col">{following.map(renderCard)}</ul>
            <FeedCaughtUp kind="following" />
          </>
        ) : null}
        {publicBundles.length > 0 ? (
          <ul className="px-padding-p8 gap-s14 flex flex-col">{publicBundles.map(renderCard)}</ul>
        ) : null}
        <FeedCaughtUp kind="all" />
      </div>
    </PageShell>
  );
}

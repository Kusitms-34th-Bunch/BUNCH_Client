'use client';

import { FeedBundleCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { FeedBundle } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { feedFixture } from '../fixtures/feed.fixture';
import { useBundleSheets } from '../hooks/useBundleSheets';
import { useClientNow } from '../hooks/useClientNow';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { useHoldScrollOnLeave } from '../hooks/useHoldScrollOnLeave';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { useScrollInHistory } from '../hooks/useScrollInHistory';
import { hideLeftMemberImages } from '../lib/deletedUserImage';
import { formatElapsedTime } from '../lib/elapsedTime';
import { readHiddenAds } from '../lib/hiddenAds';
import { FeedAdCard } from './FeedAdCard';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
};

/**
 * 피드 탭(기능명세서 6.1, Figma `4940:99466`): 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내
 * API 연결 전 fixture. 당겨서 새로고침·이어서 불러오기는 각 구현 단위에서 추가
 */
export function FeedScreen({ links }: FeedScreenProps) {
  const router = useRouter();
  const { viewer, viewerPending, asBunch } = useFeedViewer();
  const reducedMotion = useReducedMotion();
  const topRef = useRef<HTMLDivElement>(null);
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  const likes = useLikeToggle(viewer);
  const { openPlaces, openMembers } = useBundleSheets();

  useScrollInHistory(topRef);
  useHoldScrollOnLeave(topRef);

  // 소속 번치가 없으면 공개 구간만(기능명세서 6.1.7)
  const following = viewer === null ? [] : feedFixture.following;
  const publicBundles = feedFixture.public;
  // 숨긴 광고는 안내를 잠깐 보인 뒤 접혀 사라지고, 피드에 다시 들어와도 없음
  const [hiddenAds, setHiddenAds] = useState(readHiddenAds);
  const endRef = useRef<HTMLDivElement>(null);
  const ads = feedFixture.ads.filter(({ id }) => !hiddenAds.has(id));
  const handleAdGone = useCallback((adId: string, hadFocus: boolean) => {
    setHiddenAds((current) => new Set(current).add(adId));
    // 초점이 있던 카드가 없어지므로 바로 아래 안내로 옮김
    if (hadFocus) endRef.current?.focus({ preventScroll: true });
  }, []);

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
        {publicBundles.length > 0 || ads.length > 0 ? (
          <ul className="px-padding-p8 gap-s14 flex flex-col">
            {publicBundles.map(renderCard)}
            {ads.map((ad) => (
              <FeedAdCard key={ad.id} ad={ad} onGone={handleAdGone} />
            ))}
          </ul>
        ) : null}
        <div
          ref={endRef}
          tabIndex={-1}
          role="group"
          aria-label={text.allDone}
          className="outline-none"
        >
          <FeedCaughtUp kind="all" />
        </div>
      </div>
    </PageShell>
  );
}

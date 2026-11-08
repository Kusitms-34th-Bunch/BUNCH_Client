'use client';

import { toast } from '@app/design-system';
import { FeedBundleCard } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { FeedBundle, FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { FEED_TOAST_OFFSET } from '../constants/toast';
import { feedFixture } from '../fixtures/feed.fixture';
import { useClientNow } from '../hooks/useClientNow';
import { formatElapsedTime } from '../lib/elapsedTime';
import { FeedCaughtUp } from './FeedCaughtUp';
import { FeedHeader } from './FeedHeader';

type FeedScreenProps = {
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { notifications: string; bunchHome: string; otherBunch: (_bunchId: string) => string };
};

/**
 * 피드 탭(기능명세서 6.1, Figma `4940:99466`): 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내
 * API 연결 전 fixture. 당겨서 새로고침·이어서 불러오기·광고 카드는 각 구현 단위에서 추가
 */
export function FeedScreen({ links }: FeedScreenProps) {
  const router = useRouter();
  // 지금 번치는 내 정보의 기본 번치(번치 홈과 같은 기준). 받기 전은 undefined, 소속 번치가 없으면 null
  const { data: profile } = useQuery(myProfileQueryOptions());
  const viewer: FeedViewer | undefined =
    profile === undefined
      ? undefined
      : profile.bunch
        ? { bunchId: profile.bunch.id, name: profile.bunch.name, imageSrc: profile.bunch.imageSrc }
        : null;
  const reducedMotion = useReducedMotion();
  const topRef = useRef<HTMLDivElement>(null);
  // 경과 시간은 브라우저에서만 계산(서버 렌더와 시계·시간대가 달라 글자가 어긋나지 않게)
  const now = useClientNow();
  // 좋아요는 화면에서만 바꿈(서버 반영·되돌리기는 구현 단위 3)
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // 소속 번치가 없으면 공개 구간만(기능명세서 6.1.7)
  const following = viewer === null ? [] : feedFixture.following;
  const publicBundles = feedFixture.public;

  const toggleLike = (bundle: FeedBundle) => {
    if (viewer === null) {
      toast(text.joinRequired, { bottomOffset: FEED_TOAST_OFFSET });
      return;
    }
    setLiked((current) => ({ ...current, [bundle.id]: !(current[bundle.id] ?? bundle.liked) }));
  };

  const renderCard = (bundle: FeedBundle) => {
    const isLiked = liked[bundle.id] ?? bundle.liked;
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
          onPhotoClick={() => router.push(FEED_PATHS.bundle(bundle.id))}
          liked={isLiked}
          likeCount={bundle.likeCount + (isLiked === bundle.liked ? 0 : isLiked ? 1 : -1)}
          onLike={() => toggleLike(bundle)}
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

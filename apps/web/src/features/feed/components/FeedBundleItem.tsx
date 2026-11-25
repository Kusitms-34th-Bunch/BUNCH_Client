'use client';

import { FeedBundleCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { openTabPath } from '@/shared/bridge/client';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import { bundleHeroKey } from '@/shared/lib/navigation/heroKeys';
import type { useOpenBundleDetail } from '../hooks/useOpenBundleDetail';
import type { FeedBundle } from '../lib/types';
import { FEED_PATHS } from '../constants/paths';
import { useInView } from '../hooks/useInView';
import { hideLeftMemberImages } from '../lib/deletedUserImage';

// 보인 카드의 상세 미리 받기: 스크롤·그리기를 막지 않게 한가할 때(늦어도 이 안에), 한가함을 알 수 없는 브라우저는 잠시 뒤
const IDLE_TIMEOUT_MS = 2000;
const IDLE_FALLBACK_MS = 300;

type BundleDetailOpener = ReturnType<typeof useOpenBundleDetail>;

type FeedBundleItemProps = {
  bundle: FeedBundle;
  now: number | null;
  /** 지금 명의의 번치 번들인지 */
  ownBunch: boolean;
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
  openDetail: BundleDetailOpener['open'];
  prefetchDetail: BundleDetailOpener['prefetch'];
  onMembers: (_members: FeedBundle['members']) => void;
  onPlaces: (_bundleId: string, _places: FeedBundle['places']) => void;
  onLike: (_bundle: FeedBundle) => void;
  /** 사진 받는 순서(BundlePhoto `priority`): 맨 위 true, 그다음 몇 장은 바로(undefined), 그 아래 false(다가올 때) */
  photoPriority: boolean | undefined;
};

/** 피드 목록 한 칸(번들 카드) */
export function FeedBundleItem({
  bundle,
  now,
  ownBunch,
  links,
  openDetail,
  prefetchDetail,
  onMembers,
  onPlaces,
  onLike,
  photoPriority,
}: FeedBundleItemProps) {
  const router = useRouter();
  const detailHref = FEED_PATHS.bundle(bundle.bunch.id, bundle.id);
  // 화면에 보인 카드는 한가할 때 상세를 미리 받아, 누르면 다 받은 상세로 바로 hero(받는 중 화면을 거치지 않게, #573)
  const [viewRef, inView] = useInView<HTMLLIElement>();
  const prefetchOnView = usePreservedCallback(() => void prefetchDetail(bundle));
  useEffect(() => {
    if (!inView) return;
    if (typeof requestIdleCallback === 'undefined') {
      const timer = setTimeout(prefetchOnView, IDLE_FALLBACK_MS);
      return () => clearTimeout(timer);
    }
    const id = requestIdleCallback(prefetchOnView, { timeout: IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(id);
  }, [inView, prefetchOnView]);
  return (
    // 상세에서 돌아오는 hero 사진(SSGOI 복사본)이 아래 카드에 가리지 않게 그동안만 위로 올림
    <li
      ref={viewRef}
      // 말풍선 진입 zoom의 출발 카드(상세 쪽 enter 표식과 같은 값)
      data-zoom-exit-key={bundleHeroKey(bundle.id)}
      className="has-data-ssgoi-crossfade:relative has-data-ssgoi-crossfade:z-1"
    >
      <FeedBundleCard
        titleAs="h2"
        bunchName={bundle.bunch.name}
        bunchImageSrc={bundle.bunch.imageSrc}
        time={now === null ? '' : formatElapsedTime(bundle.publishedAt, now)}
        // 내 번치는 번치 탭 첫 화면이라 iOS 쉘에서는 번치 탭으로 전환(6.1.2 상세 동작 3)
        onBunchClick={() =>
          ownBunch
            ? openTabPath(links.bunchHome, (href) => router.push(href))
            : router.push(links.otherBunch(bundle.bunch.id))
        }
        members={hideLeftMemberImages(bundle.members)}
        onMembers={() => onMembers(bundle.members)}
        photos={bundle.photos}
        title={bundle.title}
        location={bundle.location}
        // 「{첫 위치} 외 N곳」일 때만 밑줄(기능명세 6.1.3 상세 2)
        locationUnderline={bundle.places.length > 1}
        onLocationClick={() => onPlaces(bundle.id, bundle.places)}
        date={bundle.date}
        onPhotoClick={() => openDetail(bundle, detailHref)}
        // 사진·말풍선에 손가락이 닿을 때만 미리 받음(하트·번치·스크롤 시작 터치는 제외)
        onPointerDown={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest('[data-engagement="comment"]'))
            void prefetchDetail(bundle, { withComments: true });
          else if (target.closest('[data-hero-enter-key]')) void prefetchDetail(bundle);
        }}
        // 번들 상세의 첫 사진과 이어 그림(AppTransitions의 피드 → 상세 hero)
        photoHeroKey={bundleHeroKey(bundle.id)}
        photoPriority={photoPriority}
        liked={bundle.liked}
        likeCount={bundle.likeCount}
        onLike={() => onLike(bundle)}
        commentCount={bundle.commentCount}
        // 기다리지 않고 바로 zoom(받는 중이면 도착할 때 댓글로 내림, #532)
        onComment={() =>
          openDetail(bundle, FEED_PATHS.bundleComments(bundle.bunch.id, bundle.id), {
            withComments: true,
          })
        }
      />
    </li>
  );
}

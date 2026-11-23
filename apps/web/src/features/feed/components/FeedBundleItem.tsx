'use client';

import { FeedBundleCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { openTabPath } from '@/shared/bridge/client';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import { bundleHeroKey } from '@/shared/lib/heroKeys';
import type { useOpenBundleDetail } from '../hooks/useOpenBundleDetail';
import type { FeedBundle } from '../lib/types';
import { FEED_PATHS } from '../constants/paths';
import { hideLeftMemberImages } from '../lib/deletedUserImage';

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
};

// 말풍선 진입이 상세를 기다리는 최대 시간(넘으면 받는 중 화면으로 열고 도착하면 댓글로 내림)
const COMMENTS_OPEN_WAIT_MS = 400;

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
}: FeedBundleItemProps) {
  const router = useRouter();
  return (
    // 상세에서 돌아오는 hero 사진(SSGOI 복사본)이 아래 카드에 가리지 않게 그동안만 위로 올림
    <li
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
        onPhotoClick={() => openDetail(bundle, FEED_PATHS.bundle(bundle.bunch.id, bundle.id))}
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
        liked={bundle.liked}
        likeCount={bundle.likeCount}
        onLike={() => onLike(bundle)}
        commentCount={bundle.commentCount}
        onComment={() =>
          // 상세를 받은 뒤 열어야 카드가 열리며 바로 댓글 위치가 보임(최대 400ms만 기다림)
          openDetail(bundle, FEED_PATHS.bundleComments(bundle.bunch.id, bundle.id), {
            waitMs: COMMENTS_OPEN_WAIT_MS,
            withComments: true,
          })
        }
      />
    </li>
  );
}

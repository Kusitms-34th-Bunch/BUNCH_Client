import { Header, LineBellLargeIcon } from '@app/design-system';
import { ProfileImage } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import wordmarkSvg from '@/shared/assets/images/logo/wordmark-dark.svg';
import type { FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';

const WORDMARK = wordmarkSvg as StaticImageData;

// 24px 아이콘, 터치 영역은 before로 40px까지 넓힘(번치 홈 헤더와 같은 방식)
const iconLinkClass =
  'text-icon-primary focus-visible:outline-border-brand relative flex cursor-pointer touch-manipulation items-center justify-center rounded-full before:absolute before:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2';

type FeedHeaderProps = {
  viewer: FeedViewer | undefined;
  /** 로고를 눌렀을 때(맨 위로) */
  onLogoClick: () => void;
  notificationsHref: string;
  bunchHomeHref: string;
};

/**
 * 피드 헤더(Figma `4940:99533`): 로고(맨 위로) · 알림 · 현재 번치 이미지(번치 홈)
 * 소속 번치가 없으면 로고만(기능명세서 6.1.7). 안 읽은 알림 점은 번치 홈 헤더처럼 Figma가 정해지면 추가
 */
export function FeedHeader({
  viewer,
  onLogoClick,
  notificationsHref,
  bunchHomeHref,
}: FeedHeaderProps) {
  return (
    <Header
      leading={
        <button
          type="button"
          aria-label={text.scrollTop}
          onClick={onLogoClick}
          // 로고 높이 19px, 누르는 영역은 before로 위아래 12px씩 넓혀 43px
          className="focus-visible:outline-border-brand rounded-r2 relative flex cursor-pointer touch-manipulation before:absolute before:inset-x-0 before:-inset-y-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Image src={WORDMARK} alt="" width={69} height={19} priority />
        </button>
      }
      trailing={
        viewer === null ? null : (
          <span className="gap-s8 flex items-center">
            <Link
              href={notificationsHref}
              aria-label={text.notifications}
              className={iconLinkClass}
            >
              <LineBellLargeIcon />
            </Link>
            {/* 지금 번치를 모르는 첫 hydration 동안은 자리만 둠 */}
            {viewer ? (
              <Link
                href={bunchHomeHref}
                aria-label={text.currentBunch(viewer.name)}
                className={iconLinkClass}
              >
                <ProfileImage
                  size="XXS"
                  src={viewer.imageSrc}
                  alt=""
                  className="outline-border-tertiary size-7 outline -outline-offset-1"
                />
              </Link>
            ) : (
              <span aria-hidden="true" className="size-7" />
            )}
          </span>
        )
      }
    />
  );
}

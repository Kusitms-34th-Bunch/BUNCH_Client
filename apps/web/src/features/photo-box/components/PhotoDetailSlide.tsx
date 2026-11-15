'use client';

import { cn } from '@app/design-system';
import { UploaderBadge } from '@app/design-system/web';
import { useState } from 'react';
import type { PhotoBoxMember, PhotoBoxPhoto } from '../lib/types';
import { photoHeroKey } from '../constants/paths';
import { getUploaders } from '../lib/photoDetail';

type PhotoDetailSlideProps = {
  photo: PhotoBoxPhoto;
  members: readonly PhotoBoxMember[];
  /** 헤더와 같이 숨겨지는 올린 멤버 배지의 숨김 여부 */
  chromeHidden: boolean;
  /** 지금 보는 사진 여부. 이 사진만 사진함 썸네일과 hero로 이어짐(옆 사진까지 이으면 함께 날아감) */
  current: boolean;
};

/**
 * 슬라이드 한 장: 원본 비율의 큰 사진과 오른쪽 위 올린 멤버 배지(함께 올린 사진은 세로로 여러 개)
 * Swiper Zoom이 `swiper-zoom-target`을 확대하므로 사진과 배지를 한 덩어리로 묶음
 * 처리 중이거나 불러오지 못한 사진은 회색 정사각형 자리표시
 */
export function PhotoDetailSlide({ photo, members, chromeHidden, current }: PhotoDetailSlideProps) {
  // 불러오지 못한 주소를 기억해 썸네일에서 원본으로 바뀌면 다시 시도(주소별로 판단)
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = brokenSrc === photo.src;
  const uploaders = getUploaders(photo, members);
  const showPlaceholder = photo.status !== 'ready' || broken;

  return (
    <div className="swiper-zoom-container">
      <div className="swiper-zoom-target relative w-full">
        {showPlaceholder ? (
          <div
            role="img"
            aria-label={photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진'}
            className="bg-surface-tertiary aspect-square w-full"
          />
        ) : (
          // 업로드한 사진은 크기·출처가 제각각이고 Swiper Zoom이 원본 요소를 확대해 next/image 최적화 제외
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.src}
            alt={photo.alt}
            // 사진함 썸네일과 이어지는 hero 짝
            data-hero-exit-key={current ? photoHeroKey(photo.id) : undefined}
            className="block h-auto w-full"
            draggable={false}
            onError={() => setBrokenSrc(photo.src)}
          />
        )}
        {uploaders.length > 0 ? (
          <div
            className={cn(
              'top-s6 right-s8 gap-s4 absolute flex flex-col items-end',
              // 한 번 누르거나 확대하면 서서히 숨김(Figma 사진 상세: 200ms, 0, 0, 0.35, 1)
              'transition-opacity duration-200 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
              chromeHidden ? 'opacity-0' : 'opacity-100',
            )}
          >
            {uploaders.map((member) => (
              <UploaderBadge key={member.id} name={member.name} avatarSrc={member.avatarSrc} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

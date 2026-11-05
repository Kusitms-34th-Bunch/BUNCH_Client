'use client';

import 'swiper/css';
import 'swiper/css/zoom';
import type { Swiper as SwiperInstance } from 'swiper/types';
import { cn } from '@app/design-system';
import { A11y, Keyboard, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { PhotoViewerState } from '../hooks/usePhotoViewer';
import type { PhotoBoxMember, PhotoBoxPhoto } from '../lib/types';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { PhotoDetailSlide } from './PhotoDetailSlide';

// 현재 사진 앞뒤 이만큼만 그리고 나머지는 빈 슬라이드(사진이 많아도 가볍게 유지)
const RENDER_RANGE = 1;
const MAX_ZOOM = 3;

// 포커스가 있을 때만 보이는 키보드·스크린 리더용 버튼
const HIDDEN_BUTTON =
  'focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10';

type PhotoViewerSwiperProps = {
  /** `usePhotoViewer`가 돌려준 상태 */
  viewer: PhotoViewerState;
  photos: readonly PhotoBoxPhoto[];
  members: readonly PhotoBoxMember[];
  /** 저장·삭제 같은 요청이 도는 동안 사진 영역을 막음(헤더는 막지 않아 더보기가 포커스를 유지) */
  inert?: boolean;
};

/**
 * 크게 보기 화면의 사진 영역: 좌우로 넘기는 원본 비율 사진과 올린 멤버 배지(결정 기록 015, Swiper Zoom·Keyboard·A11y)
 * 스와이프의 단일 포인터 대체로 포커스가 있을 때만 보이는 이전·다음 버튼과 확대·축소 버튼을 함께 둠
 * 헤더·제목·메뉴·삭제는 이 컴포넌트를 쓰는 화면의 몫
 */
export function PhotoViewerSwiper({ viewer, photos, members, inert }: PhotoViewerSwiperProps) {
  const { activeIndex, chromeHidden, zoomed, total } = viewer;

  return (
    <div className="relative h-full" inert={inert}>
      <Swiper
        modules={[Zoom, Keyboard, A11y]}
        className="h-full"
        initialSlide={viewer.initialIndex}
        slidesPerView={1}
        resistance={false}
        zoom={{ maxRatio: MAX_ZOOM, toggle: true }}
        keyboard={{ enabled: true }}
        a11y={{
          prevSlideMessage: PHOTO_BOX_MESSAGES.previousPhoto,
          nextSlideMessage: PHOTO_BOX_MESSAGES.nextPhoto,
        }}
        onSwiper={viewer.attachSwiper}
        onSlideChange={viewer.handleSlideChange}
        onZoomChange={(_swiper: SwiperInstance, scale: number) => viewer.setZoomed(scale > 1)}
        onTap={viewer.handleTap}
        onDoubleTap={viewer.handleDoubleTap}
      >
        {photos.map((photo, index) => (
          <SwiperSlide
            key={photo.id}
            aria-hidden={Math.abs(index - activeIndex) <= RENDER_RANGE ? undefined : true}
          >
            {Math.abs(index - activeIndex) <= RENDER_RANGE ? (
              <PhotoDetailSlide photo={photo} members={members} chromeHidden={chromeHidden} />
            ) : null}
          </SwiperSlide>
        ))}
      </Swiper>
      <button
        type="button"
        onClick={viewer.slidePrev}
        aria-disabled={activeIndex <= 0 ? true : undefined}
        className={cn(HIDDEN_BUTTON, 'focus-visible:left-s8 focus-visible:top-s8')}
      >
        {PHOTO_BOX_MESSAGES.previousPhoto}
      </button>
      <button
        type="button"
        onClick={viewer.slideNext}
        aria-disabled={activeIndex >= total - 1 ? true : undefined}
        className={cn(HIDDEN_BUTTON, 'focus-visible:right-s8 focus-visible:top-s8')}
      >
        {PHOTO_BOX_MESSAGES.nextPhoto}
      </button>
      <button
        type="button"
        aria-pressed={zoomed}
        onClick={viewer.toggleZoom}
        className={cn(HIDDEN_BUTTON, 'focus-visible:left-s8 focus-visible:bottom-s8')}
      >
        {zoomed ? PHOTO_BOX_MESSAGES.zoomOut : PHOTO_BOX_MESSAGES.zoomIn}
      </button>
    </div>
  );
}

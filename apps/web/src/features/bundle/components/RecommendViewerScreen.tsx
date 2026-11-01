'use client';

import 'swiper/css';
import 'swiper/css/zoom';
import type { Swiper as SwiperInstance } from 'swiper/types';
import { cn, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useRef, useState } from 'react';
import { A11y, Keyboard, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { PhotoBoxMember, PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { PhotoDetailSlide } from '@/features/photo-box/components/PhotoDetailSlide';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { formatDetailDate } from '@/features/photo-box/lib/photoDetail';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';

// 단일 탭과 더블탭(확대)을 구분하기 위해 단일 탭 처리를 잠깐 미룸
const TAP_DELAY_MS = 250;
// 현재 사진 앞뒤 이만큼만 그리고 나머지는 빈 슬라이드(사진이 많아도 가볍게 유지)
const RENDER_RANGE = 1;
const MAX_ZOOM = 3;

type RecommendViewerScreenProps = {
  /** 추천 순서를 지킨 사진 */
  photos: readonly PhotoBoxPhoto[];
  members: readonly PhotoBoxMember[];
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange?: ((_photoId: string) => void) | undefined;
};

/**
 * 추천 번들 사진 뷰어(Figma `2060:38839`): 헤더에 촬영 날짜, 좌우로 넘기는 원본 비율 사진과 올린 멤버 배지
 * 한 번 누르거나 확대하면 헤더와 배지를 숨기고 다시 누르면 보임. 저장·날짜 변경·삭제는 없는 보기 전용(기획 4.2.6)
 */
export function RecommendViewerScreen({
  photos,
  members,
  initialPhotoId,
  currentYear = new Date().getFullYear(),
  onBack,
  onPhotoChange,
}: RecommendViewerScreenProps) {
  const initialIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
  const [activeId, setActiveId] = useState(photos[initialIndex]?.id ?? initialPhotoId);
  const [tapHidden, setTapHidden] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeIndex = photos.findIndex((photo) => photo.id === activeId);
  const activePhoto = photos[activeIndex];
  const chromeHidden = tapHidden || zoomed;

  // 단일 탭만 헤더·배지를 토글(더블탭은 확대라 토글하지 않음)
  const handleTap = () => {
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapHidden((hidden) => !hidden), TAP_DELAY_MS);
  };
  const handleDoubleTap = () => clearTimeout(tapTimer.current);

  const handleSlideChange = (swiper: SwiperInstance) => {
    const next = photos[swiper.activeIndex];
    if (!next || next.id === activeId) return;
    setActiveId(next.id);
    onPhotoChange?.(next.id);
  };

  if (!activePhoto) return null;

  const headerFade = cn(
    'relative transition-opacity duration-200 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
    // 숨긴 상태에서도 키보드·스크린 리더로 접근: 포커스가 들어오면 다시 보임
    chromeHidden
      ? 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100'
      : 'opacity-100',
  );

  return (
    <PageShell
      header={
        <div className={headerFade}>
          <Header
            leading={
              <HeaderIconButton label={BUNDLE_SELECT_MESSAGES.back} onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={formatDetailDate(activePhoto.takenAt, currentYear)}
          />
        </div>
      }
    >
      <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.viewerTitle}</h1>
      <p role="status" className="sr-only">
        {BUNDLE_SELECT_MESSAGES.photoPosition(activeIndex + 1, photos.length)}
      </p>
      <div className="relative h-full">
        <Swiper
          modules={[Zoom, Keyboard, A11y]}
          className="h-full"
          initialSlide={initialIndex}
          slidesPerView={1}
          resistance={false}
          zoom={{ maxRatio: MAX_ZOOM, toggle: true }}
          keyboard={{ enabled: true }}
          a11y={{
            prevSlideMessage: PHOTO_BOX_MESSAGES.previousPhoto,
            nextSlideMessage: PHOTO_BOX_MESSAGES.nextPhoto,
          }}
          onSwiper={(swiper: SwiperInstance) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={handleSlideChange}
          onZoomChange={(_swiper: SwiperInstance, scale: number) => setZoomed(scale > 1)}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
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
        {/* 스와이프의 단일 포인터 대체: 키보드·스크린 리더 사용자가 쓰는 이전·다음 버튼(포커스가 있을 때만 보임) */}
        <button
          type="button"
          onClick={() => {
            if (activeIndex > 0) swiperRef.current?.slidePrev();
          }}
          aria-disabled={activeIndex <= 0 ? true : undefined}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:left-s8 focus-visible:top-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {PHOTO_BOX_MESSAGES.previousPhoto}
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeIndex < photos.length - 1) swiperRef.current?.slideNext();
          }}
          aria-disabled={activeIndex >= photos.length - 1 ? true : undefined}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:right-s8 focus-visible:top-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {PHOTO_BOX_MESSAGES.nextPhoto}
        </button>
        {/* 키보드·스크린 리더 사용자의 확대·축소 수단(포커스가 있을 때만 보임) */}
        <button
          type="button"
          aria-pressed={zoomed}
          onClick={() => swiperRef.current?.zoom.toggle()}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:left-s8 focus-visible:bottom-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {zoomed ? PHOTO_BOX_MESSAGES.zoomOut : PHOTO_BOX_MESSAGES.zoomIn}
        </button>
      </div>
    </PageShell>
  );
}

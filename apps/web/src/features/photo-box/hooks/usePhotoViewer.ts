'use client';

import type { Swiper as SwiperInstance } from 'swiper/types';
import { useEffect, useRef, useState } from 'react';

// 단일 탭과 더블탭(확대)을 구분하기 위해 단일 탭 처리를 잠깐 미룸
const TAP_DELAY_MS = 250;

type UsePhotoViewerOptions = {
  /** 넘겨 볼 순서대로의 사진(id만 씀) */
  photos: readonly { id: string }[];
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange?: ((_photoId: string) => void) | undefined;
  /** 메뉴·확인 창이 열려 있어 방향키로 사진을 넘기면 안 될 때(Swiper Keyboard는 문서 단위라 따로 끔) */
  keyboardBlocked?: boolean;
};

/**
 * 사진을 좌우로 넘겨 크게 보는 화면의 공통 상태(사진함 사진 상세, 추천 사진 뷰어, 번들 사진 크게 보기)
 * 지금 보는 사진, 한 번 누르거나 확대하면 헤더·배지를 숨기는 상태(숨긴 채 넘겨도 유지), Swiper 보정을 맡고
 * 헤더·메뉴·삭제 같은 화면별 동작은 이 hook을 쓰는 화면이 정함. 짝이 되는 그림은 `PhotoViewerSwiper`
 */
export function usePhotoViewer({
  photos,
  initialPhotoId,
  onPhotoChange,
  keyboardBlocked = false,
}: UsePhotoViewerOptions) {
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
  const chromeHidden = tapHidden || zoomed;

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  // 단일 탭만 헤더·배지를 토글(더블탭은 확대라 토글하지 않음)
  const handleTap = () => {
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapHidden((hidden) => !hidden), TAP_DELAY_MS);
  };
  const handleDoubleTap = () => clearTimeout(tapTimer.current);

  /** 지금 보는 사진을 바꿈(삭제 뒤 이웃 사진으로 이어 볼 때처럼 화면이 직접 정할 때) */
  const showPhoto = (photoId: string) => {
    setActiveId(photoId);
    onPhotoChange?.(photoId);
  };

  const handleSlideChange = (swiper: SwiperInstance) => {
    const next = photos[swiper.activeIndex];
    if (!next || next.id === activeId) return;
    showPhoto(next.id);
  };

  // 메뉴·확인 창이 열려 있거나 요청이 도는 동안은 방향키가 사진을 넘기지 않게 함
  useEffect(() => {
    const keyboard = swiperRef.current?.keyboard;
    if (!keyboard) return;
    if (keyboardBlocked) keyboard.disable();
    else keyboard.enable();
  }, [keyboardBlocked]);

  // 날짜 변경·삭제로 목록이 바뀌면 지금 보는 사진이 있는 슬라이드로 Swiper를 다시 맞춤
  useEffect(() => {
    const instance = swiperRef.current;
    if (!instance || activeIndex < 0 || instance.activeIndex === activeIndex) return;
    instance.update();
    instance.slideTo(activeIndex, 0);
  }, [activeIndex, photos.length]);

  // Swiper 인스턴스를 붙잡고 버튼으로 넘기는 동작(스와이프의 단일 포인터 대체)
  const attachSwiper = (swiper: SwiperInstance) => {
    swiperRef.current = swiper;
  };
  const slidePrev = () => {
    if (activeIndex > 0) swiperRef.current?.slidePrev();
  };
  const slideNext = () => {
    if (activeIndex < photos.length - 1) swiperRef.current?.slideNext();
  };
  const toggleZoom = () => swiperRef.current?.zoom.toggle();

  return {
    initialIndex,
    activeId,
    activeIndex,
    chromeHidden,
    zoomed,
    setZoomed,
    attachSwiper,
    slidePrev,
    slideNext,
    toggleZoom,
    total: photos.length,
    showPhoto,
    handleTap,
    handleDoubleTap,
    handleSlideChange,
  };
}

export type PhotoViewerState = ReturnType<typeof usePhotoViewer>;

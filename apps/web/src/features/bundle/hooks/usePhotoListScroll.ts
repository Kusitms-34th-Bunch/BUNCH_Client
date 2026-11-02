'use client';

import { type UIEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PHOTO_STEP } from '../constants/photoList';

/**
 * 캡션 화면의 가로 사진 목록 스크롤: 가운데에 온 사진 번호, 그 자리로 스크롤 맞추기,
 * 움직이는 동안 스크롤 스냅 끄기, 사진의 「크게 보기」 버튼으로 포커스 옮기기
 * 목록 요소(ref)를 만지는 일은 모두 이 hook 안에서 하고, 다른 hook에는 함수로만 내줌
 */
export function usePhotoListScroll(total: number, initialIndex: number) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<HTMLUListElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 목록 끝을 넘지 않는, 지금 가운데에 온 사진 번호
  const current = Math.min(activeIndex, Math.max(0, total - 1));

  // 처음에는 주소가 가리키는 사진이 가운데 오게 맞춤
  const initialIndexRef = useRef(initialIndex);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollLeft = initialIndexRef.current * PHOTO_STEP;
  }, []);

  useEffect(
    () => () => {
      clearTimeout(snapTimer.current);
      clearTimeout(focusTimer.current);
    },
    [],
  );

  const scrollToIndex = (index: number) => {
    const list = listRef.current;
    if (list) list.scrollLeft = index * PHOTO_STEP;
  };

  const handleScroll = (event: UIEvent<HTMLUListElement>) =>
    setActiveIndex(
      Math.min(
        Math.max(0, Math.round(event.currentTarget.scrollLeft / PHOTO_STEP)),
        Math.max(0, total - 1),
      ),
    );

  /** 움직이는 동안 transform이 늘린 스크롤 영역에 스냅이 다시 맞춰져 목록이 끌려가므로 스냅을 `ms` 동안 끔(동작 줄이기에서는 이동이 없어 끄지 않음) */
  const pauseSnap = (ms: number) => {
    const list = listRef.current;
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    list.style.scrollSnapType = 'none';
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      list.style.scrollSnapType = '';
    }, ms);
  };

  /** `index`번째 사진의 「크게 보기」 버튼으로 `delay` 뒤에 포커스를 옮김(스크롤은 하지 않음) */
  const focusPhotoView = (index: number, delay: number) => {
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      listRef.current
        ?.querySelectorAll<HTMLElement>('[data-photo-view]')
        [index]?.focus({ preventScroll: true });
    }, delay);
  };

  return {
    listRef,
    current,
    setActiveIndex,
    scrollToIndex,
    handleScroll,
    pauseSnap,
    focusPhotoView,
  };
}

export type PhotoListScroll = ReturnType<typeof usePhotoListScroll>;

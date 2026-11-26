'use client';

import { useEffect } from 'react';
import { pressScaleFor } from '@/shared/lib/pressScale';

// 이만큼 움직이면 누르기가 아니라 스크롤로 봄(iOS 목록이 눌림을 푸는 거리와 비슷하게)
const MOVE_PX = 8;
const ATTR = 'data-touch-scrolling';
// 줄어드는 요소(디자인 시스템 press-scale*)
const PRESS_SCALE = '.press-scale, .press-scale-small, .press-scale-medium, .press-scale-large';

// 누르는 순간 비율을 넣음(CSS는 자기 크기로 나눌 수 없어서). 측정 전·키보드는 유틸리티의 단계 기본값
const setPressScale = (event: Event) => {
  const target = event.target instanceof Element ? event.target.closest(PRESS_SCALE) : null;
  if (!(target instanceof HTMLElement)) return;
  target.style.setProperty(
    '--press-scale',
    pressScaleFor(target.offsetWidth, target.offsetHeight).toFixed(3),
  );
};

/**
 * 누른 채 스크롤하면 눌림 표시를 풂(#583, Figma 「스크롤 제스처엔 효과 없음」). iOS WebView는 스크롤해도 :active가 남음
 * 손가락이 움직이거나 스크롤이 일어나면 문서에 표시를 달고, 손가락을 떼면 지움. 표시를 보는 쪽은 디자인 시스템 press-overlay·press-scale
 * 누르는 순간 줄어들 요소의 크기로 --press-scale도 넣음(Figma 7982:51780 크기 기반 축소)
 */
export function PressScrollGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let start: { x: number; y: number } | undefined;
    const mark = () => {
      if (!root.hasAttribute(ATTR)) root.setAttribute(ATTR, '');
    };
    const onStart = (event: TouchEvent) => {
      // 스크롤 중에 손가락이 더 닿으면(핀치 포함) 표시를 그대로 둠
      if (event.touches.length > 1) return mark();
      const touch = event.touches[0];
      start = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
      root.removeAttribute(ATTR);
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) return;
      if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > MOVE_PX) mark();
    };
    const onScroll = () => {
      if (start) mark();
    };
    const onEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      start = undefined;
      root.removeAttribute(ATTR);
    };
    const options = { passive: true, capture: true } as const;
    document.addEventListener('pointerdown', setPressScale, options);
    document.addEventListener('touchstart', onStart, options);
    document.addEventListener('touchmove', onMove, options);
    document.addEventListener('scroll', onScroll, options);
    document.addEventListener('touchend', onEnd, options);
    document.addEventListener('touchcancel', onEnd, options);
    return () => {
      document.removeEventListener('pointerdown', setPressScale, options);
      document.removeEventListener('touchstart', onStart, options);
      document.removeEventListener('touchmove', onMove, options);
      document.removeEventListener('scroll', onScroll, options);
      document.removeEventListener('touchend', onEnd, options);
      document.removeEventListener('touchcancel', onEnd, options);
      root.removeAttribute(ATTR);
    };
  }, []);
  return null;
}

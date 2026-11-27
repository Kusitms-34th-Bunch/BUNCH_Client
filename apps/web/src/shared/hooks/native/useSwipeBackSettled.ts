'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { appBridge, hasNativeMethod } from '@/shared/bridge/client';

// iOS 쉘이 WebView 스와이프 뒤로 가기 시작(detail true)·이동 없이 끝남(false)을 알리는 이벤트(SSGOI 패치도 받음)
export const SWIPE_BACK_EVENT = 'ssgoi:swipe-back';
// 보이는 사진의 디코딩을 기다리는 상한(넘으면 그대로 알림, 쉘도 1초 뒤 스스로 걷음)
const DECODE_LIMIT_MS = 400;

// 화면 안에 보이는 사진이 다 그려질 때까지(틀만 그리고 사진 칸이 빈 채 덮개가 걷히지 않게)
const visibleImagesDecoded = () => {
  const images = [...document.querySelectorAll('img')].filter((image) => {
    if (!image.currentSrc && !image.src) return false;
    const { top, bottom, left, right } = image.getBoundingClientRect();
    return bottom > 0 && top < window.innerHeight && right > 0 && left < window.innerWidth;
  });
  const limit = new Promise<void>((resolve) => setTimeout(resolve, DECODE_LIMIT_MS));
  return Promise.race([Promise.allSettled(images.map((image) => image.decode())), limit]);
};

/**
 * 스와이프로 돌아간 화면을 그린 뒤 쉘에 알림(#587). 쉘은 이동 순간 덮어 둔 화면을 걷음
 * 덮개 없이 걷히면 WebKit 스냅샷이 사라진 뒤 아직 그리지 않은 흰 화면이 보였음. 두 프레임 뒤(그린 다음), 보이는 사진 디코딩까지 기다려 알림
 */
export function useSwipeBackSettled() {
  const pathname = usePathname();
  const swiping = useRef(false);

  useEffect(() => {
    const onSwipe = (event: Event) => {
      swiping.current = (event as CustomEvent<unknown>).detail === true;
    };
    window.addEventListener(SWIPE_BACK_EVENT, onSwipe);
    return () => window.removeEventListener(SWIPE_BACK_EVENT, onSwipe);
  }, []);

  useEffect(() => {
    if (!swiping.current) return;
    swiping.current = false;
    if (!hasNativeMethod('swipeBackSettled')) return;
    let active = true;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        void visibleImagesDecoded().then(() => {
          if (active) void appBridge.swipeBackSettled().catch(() => {});
        });
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [pathname]);
}

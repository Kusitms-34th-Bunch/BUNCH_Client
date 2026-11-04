'use client';

import { useEffect } from 'react';

/**
 * 입력창에 포커스하거나 키보드로 화면 높이가 바뀌면 포커스된 입력창이 보이게 스크롤
 * `nearest`라 이미 보이면 스크롤하지 않고, 핀치 줌 중에는 스크롤하지 않음
 */
export function useScrollFocusedIntoView() {
  useEffect(() => {
    const reveal = () => {
      // 확대한 채 화면을 읽는 중에 시점이 입력창으로 되돌려지는 것 방지
      if (window.visualViewport && window.visualViewport.scale > 1) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement) active.scrollIntoView({ block: 'nearest' });
    };
    const viewport = window.visualViewport;
    document.addEventListener('focusin', reveal);
    viewport?.addEventListener('resize', reveal);
    return () => {
      document.removeEventListener('focusin', reveal);
      viewport?.removeEventListener('resize', reveal);
    };
  }, []);
}

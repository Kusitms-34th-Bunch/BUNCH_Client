'use client';

import { useEffect } from 'react';
import { isKeyboardShown } from '@/shared/lib/keyboard';

const HEIGHT_VAR = '--keyboard-viewport-height';

// 입력란이 본문 안에서 보이게 둘 때 키보드 위 여백
const REVEAL_MARGIN = 16;

/** 본문(main)만 스크롤해 초점 입력란을 보이게(scrollIntoView는 문서까지 스크롤해 다시 밀림) */
const revealFocused = () => {
  // 확대해 읽는 중에는 시점을 입력란으로 되돌리지 않음
  if (window.visualViewport && window.visualViewport.scale > 1.01) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return;
  const main = active.closest('main');
  if (!main) return;
  const box = main.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  if (rect.bottom > box.bottom) main.scrollTop += rect.bottom - box.bottom + REVEAL_MARGIN;
  else if (rect.top < box.top) main.scrollTop -= box.top - rect.top + REVEAL_MARGIN;
};

/**
 * iOS WebView는 키보드가 떠도 레이아웃 높이가 그대로라, 아래 입력란을 보이려고 문서 전체를 올려 헤더가 상태 바 뒤로 밀림
 * 키보드가 떠 있는 동안 앱 틀 높이를 보이는 높이(--keyboard-viewport-height)로 줄이고 문서 위치를 0으로 되돌림
 * 키보드가 닫힐 때와 앱으로 돌아올 때(키보드를 연 채 백그라운드)도 남은 위치를 되돌림. 핀치 확대 중·앱 틀 밖 입력란은 위치를 두고 높이만 맞춤
 */
export function KeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    // 키보드가 올린 위치가 남아 있을 수 있음(열렸던 뒤 0을 확인할 때까지). 키보드와 무관한 문서 스크롤(낮은 화면)은 건드리지 않음
    let residue = false;
    const sync = () => {
      // 확대 중에도 높이는 레이아웃 기준(보이는 높이 × 배율)으로 맞춤
      const height = viewport.height * viewport.scale;
      const open = isKeyboardShown(viewport);
      if (open) residue = true;
      if (open) {
        root.style.setProperty(HEIGHT_VAR, `${height}px`);
        root.setAttribute('data-keyboard-open', '');
      } else {
        root.style.removeProperty(HEIGHT_VAR);
        root.removeAttribute('data-keyboard-open');
      }
      // 확대해 읽는 중이거나, 앱 틀 밖(body 포털의 모달·시트) 입력란이면 iOS가 올린 위치를 그대로 둠(되돌리면 키보드 뒤로 가림)
      const active = document.activeElement;
      const outsideFrame =
        active instanceof Element &&
        active !== document.body &&
        !active.closest('[data-app-frame]');
      const shifted = window.scrollY !== 0 || viewport.offsetTop !== 0;
      if (residue && viewport.scale <= 1.01 && !outsideFrame && shifted) window.scrollTo(0, 0);
      else if (!open && !shifted) residue = false;
      // 키보드 높이가 여러 번에 걸쳐 바뀌어도 매번 확인(이미 보이면 움직이지 않음)
      if (open) revealFocused();
    };
    // 키보드가 닫히는 중이나 복귀 직후에는 값이 늦게 바뀌어 다음 프레임에도 한 번 더
    const syncSoon = () => {
      sync();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    // 키보드가 열린 채 다른 입력란으로 옮기면 그 입력란도 보이게(새로 열릴 때만 하면 아래 입력란이 키보드 뒤에 남음)
    const onFocusIn = () => {
      if (!root.hasAttribute('data-keyboard-open')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(revealFocused);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncSoon();
    };
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    document.addEventListener('focusout', syncSoon);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', syncSoon);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      document.removeEventListener('focusout', syncSoon);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', syncSoon);
      root.style.removeProperty(HEIGHT_VAR);
      root.removeAttribute('data-keyboard-open');
    };
  }, []);
  return null;
}

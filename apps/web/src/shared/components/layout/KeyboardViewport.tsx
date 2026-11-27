'use client';

import { useEffect } from 'react';
import { appBridge } from '@/shared/bridge/client';
import { cubicBezierEasing } from '@/shared/components/layout/easeOutIntegrator.internal';
import { KEYBOARD_MIN_HEIGHT, isKeyboardShown } from '@/shared/lib/keyboard';

const HEIGHT_VAR = '--keyboard-viewport-height';

// 입력란이 본문 안에서 보이게 둘 때 키보드 위 여백
const REVEAL_MARGIN = 16;
// 앱 틀 높이를 키보드와 비슷한 감속 곡선으로 따라가게, 열림·닫힘 같은 곡선(근거 녹화는 mobile-shell-webview.md, #568)
// 아래 여백도 AppFrame이 같은 시간·곡선으로 바꿈(data-keyboard-moving)
const FOLLOW_MS = 300;
// 쉘이 키보드 시간을 알려 줄 때 AppFrame 아래 여백 전환도 같은 시간으로
const FOLLOW_MS_VAR = '--keyboard-follow-ms';
// 쉘 알림과 보이는 높이가 이만큼 안쪽으로 다르면 같은 목표로 보고 처음부터 다시 움직이지 않음
const SAME_TARGET_PX = 2;
const followEase = cubicBezierEasing([0.2, 0.8, 0.2, 1]);
const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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
    // 앱 틀 높이를 목표까지 곡선으로 옮김(null이면 원래 높이로 늘린 뒤 변수를 지움)
    let shown = window.innerHeight;
    let heightFrame = 0;
    // 입력란을 벗어나 키보드를 닫는 중(다시 입력란에 초점이 오면 풂)
    let dismissing = false;
    // 쉘이 마지막으로 알려 준 키보드 상태(알림을 받은 뒤로는 열림·닫힘을 이 값으로 판단, 없으면 undefined)
    let nativeOpen: boolean | undefined;
    // 진행 중인 목표(같은 높이를 여러 번 알려 줘도 처음부터 다시 시작하지 않게)
    let heading: number | null | undefined;
    const moveHeight = (target: number | null, duration = FOLLOW_MS) => {
      if (heading === target) return;
      if (heading != null && target != null && Math.abs(heading - target) < SAME_TARGET_PX) return;
      heading = target;
      cancelAnimationFrame(heightFrame);
      const to = target ?? window.innerHeight;
      // 다 닫혀 있으면(변수 없음) 그동안 바뀐 창 높이에서 출발, 닫히는 중이면 지금 높이에서
      const from = root.style.getPropertyValue(HEIGHT_VAR) ? shown : window.innerHeight;
      const apply = (value: number) => {
        shown = value;
        if (target === null && value === to) root.style.removeProperty(HEIGHT_VAR);
        else root.style.setProperty(HEIGHT_VAR, `${value}px`);
      };
      if (reducedMotion() || duration <= 0 || Math.abs(to - from) < 1) {
        root.removeAttribute('data-keyboard-moving');
        apply(to);
        return;
      }
      root.style.setProperty(FOLLOW_MS_VAR, `${duration}ms`);
      root.setAttribute('data-keyboard-moving', '');
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        apply(progress === 1 ? to : from + (to - from) * followEase(progress));
        if (progress < 1) heightFrame = requestAnimationFrame(step);
        else {
          root.removeAttribute('data-keyboard-moving');
          // 줄어드는 동안 본문 아래 경계가 올라가 입력란이 키보드 뒤에 남지 않게 다 줄어든 뒤 한 번 더
          if (target !== null) revealFocused();
        }
      };
      heightFrame = requestAnimationFrame(step);
    };
    // 키보드가 올린 위치가 남아 있을 수 있음(열렸던 뒤 0을 확인할 때까지). 키보드와 무관한 문서 스크롤(낮은 화면)은 건드리지 않음
    let residue = false;
    const sync = () => {
      // 확대 중에도 높이는 레이아웃 기준(보이는 높이 × 배율)으로 맞춤
      const height = viewport.height * viewport.scale;
      // 입력란을 벗어나 닫기 시작했으면 iOS가 늦게 보내는 키보드 높이로 다시 줄이지 않음
      const keyboardShown = isKeyboardShown(viewport);
      const open = nativeOpen ?? (keyboardShown && !dismissing);
      if (open) residue = true;
      if (open) {
        // 쉘 알림이 있으면 쉘이 정한 목표·시간을 유지(늦게 바뀌는 보이는 높이로 덮지 않음), 없을 때만 보이는 높이로
        if (keyboardShown && nativeOpen === undefined) moveHeight(height);
        root.setAttribute('data-keyboard-open', '');
      } else {
        moveHeight(null);
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
    // 화면을 눌러 입력란을 벗어나면 iOS의 닫힘 알림(약 60ms 늦음)을 기다리지 않고 키보드와 함께 내려가기 시작
    // 다른 입력란으로 옮기는 중이면(키보드 유지) 그대로 둠
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      const typing = next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement;
      if (root.hasAttribute('data-keyboard-open') && !typing) {
        dismissing = true;
        if (nativeOpen !== undefined) nativeOpen = false;
        moveHeight(null);
        root.removeAttribute('data-keyboard-open');
      }
      syncSoon();
    };
    // 키보드가 열린 채 다른 입력란으로 옮기면 그 입력란도 보이게(새로 열릴 때만 하면 아래 입력란이 키보드 뒤에 남음)
    const onFocusIn = (event: FocusEvent) => {
      // 입력란에 초점이 올 때만 닫는 중을 풂(초점이 돌아와 키보드가 그대로면 쉘 알림이 없어 보이는 높이로 판단)
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        dismissing = false;
        if (nativeOpen === false) nativeOpen = undefined;
      }
      if (!root.hasAttribute('data-keyboard-open')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(revealFocused);
    };
    // iOS 쉘은 키보드가 움직이기 직전 덮는 높이·시간을 알려 줌(늦게 오는 보이는 높이 대신 이 값으로 같은 시간에 시작)
    // 쓸어 닫기처럼 초점이 그대로인 닫힘도 잡음. 이전 쉘·브라우저는 알림이 없어 보이는 높이·초점으로 맞춤
    const offNativeKeyboard = appBridge.addEventListener(
      'nativeKeyboard',
      ({ height, duration }) => {
        if (document.visibilityState !== 'visible') return;
        // 하드웨어 키보드의 예측 막대처럼 낮은 높이는 닫힘으로(보이는 높이 기준과 같게)
        dismissing = height <= KEYBOARD_MIN_HEIGHT;
        nativeOpen = !dismissing;
        if (dismissing) {
          moveHeight(null, duration);
          root.removeAttribute('data-keyboard-open');
        } else {
          moveHeight(window.innerHeight - height, duration);
          root.setAttribute('data-keyboard-open', '');
        }
      },
    );
    // 가려진 동안 온 쉘 알림은 버려서, 돌아오면 쉘 상태를 잊고 보이는 높이로 다시 판단(키보드를 연 채 백그라운드)
    const resync = () => {
      nativeOpen = undefined;
      syncSoon();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', resync);
    return () => {
      offNativeKeyboard();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(heightFrame);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', resync);
      root.style.removeProperty(HEIGHT_VAR);
      root.removeAttribute('data-keyboard-open');
      root.removeAttribute('data-keyboard-moving');
      root.style.removeProperty(FOLLOW_MS_VAR);
    };
  }, []);
  return null;
}

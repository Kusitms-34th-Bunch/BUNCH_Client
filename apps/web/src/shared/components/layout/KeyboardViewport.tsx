'use client';

import { useEffect } from 'react';
import { appBridge } from '@/shared/bridge/client';
import { cubicBezierEasing } from '@/shared/components/layout/easeOutIntegrator.internal';
import { KEYBOARD_MIN_HEIGHT, isKeyboardShown } from '@/shared/lib/keyboard';

const HEIGHT_VAR = '--keyboard-viewport-height';

// 입력란이 본문 안에서 보이게 둘 때 키보드 위 여백
const REVEAL_MARGIN = 16;
// 아래 영역이 키보드와 비슷한 감속 곡선으로 따라감, 열림·닫힘 같은 곡선(근거 녹화는 mobile-shell-webview.md, #568)
const FOLLOW_MS = 300;
// 키보드와 함께 움직이는 아래 영역: 화면의 하단 슬롯(PageShell)과 앱 틀 아래 여백
const FOLLOWERS =
  '[data-app-frame] [data-page-shell] > [data-toast-anchor], [data-app-frame] > [data-safe-area-bottom]';
const SPACER = '[data-app-frame] > [data-safe-area-bottom]';
// 쉘 알림과 보이는 높이가 이만큼 안쪽으로 다르면 같은 목표로 보고 처음부터 다시 움직이지 않음
const SAME_TARGET_PX = 2;
const followEase = cubicBezierEasing([0.2, 0.8, 0.2, 1]);
const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * 본문(main)만 스크롤해 초점 입력란을 보이게(scrollIntoView는 문서까지 스크롤해 다시 밀림)
 * `shrink`: 곧 줄어들 본문 아래 경계(앱 틀 높이를 끝에 줄이는 열림에서 시작할 때 미리 맞춤)
 */
const revealFocused = (shrink = 0) => {
  // 확대해 읽는 중에는 시점을 입력란으로 되돌리지 않음
  if (window.visualViewport && window.visualViewport.scale > 1.01) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return;
  const main = active.closest('main');
  if (!main) return;
  const box = main.getBoundingClientRect();
  const bottom = box.bottom - shrink;
  const rect = active.getBoundingClientRect();
  if (rect.bottom > bottom) main.scrollTop += rect.bottom - bottom + REVEAL_MARGIN;
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
    // 앱 틀에 넣은 높이(null이면 100dvh)
    let committed: number | null = null;
    let heightFrame = 0;
    // 움직이는 동안 transform을 준 아래 영역
    let lifted: HTMLElement[] = [];
    // 입력란을 벗어나 키보드를 닫는 중(다시 입력란에 초점이 오면 풂)
    let dismissing = false;
    // 쉘이 마지막으로 알려 준 키보드 상태(알림을 받은 뒤로는 열림·닫힘을 이 값으로 판단, 없으면 undefined)
    let nativeOpen: boolean | undefined;
    // 진행 중인 목표(같은 높이를 여러 번 알려 줘도 처음부터 다시 시작하지 않게)
    let heading: number | null | undefined;
    const commit = (target: number | null) => {
      committed = target;
      if (target === null) root.style.removeProperty(HEIGHT_VAR);
      else root.style.setProperty(HEIGHT_VAR, `${target}px`);
    };
    const lift = (offset: number) => {
      for (const element of lifted) element.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    // 열리는 동안 본문을 미리 스크롤할 수 있게 줄어들 만큼 임시로 늘린 아래 여백(높이를 줄인 뒤 걷음)
    let roomed: { main: HTMLElement; previous: string } | null = null;
    const makeRoom = (shrink: number) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return;
      const main = active.closest('main');
      if (!main) return;
      roomed = { main, previous: main.style.paddingBottom };
      const current = Number.parseFloat(getComputedStyle(main).paddingBottom) || 0;
      main.style.paddingBottom = `${current + shrink}px`;
    };
    const land = () => {
      for (const element of lifted) {
        element.style.transform = '';
        element.style.willChange = '';
      }
      lifted = [];
      if (roomed) roomed.main.style.paddingBottom = roomed.previous;
      roomed = null;
    };
    // 높이는 한 번만 바꾸고 아래 영역은 지금 보이는 자리에서 transform으로 따라감(FLIP, 매 프레임 높이를 바꾸면 끊김, #605)
    // 줄어들 때는 끝에(본문 아래가 키보드보다 먼저 잘리지 않게), 늘어날 때는(닫힘·낮아진 키보드) 먼저 바꿈
    const moveHeight = (target: number | null, duration = FOLLOW_MS) => {
      if (heading === target) return;
      if (heading != null && target != null && Math.abs(heading - target) < SAME_TARGET_PX) return;
      heading = target;
      cancelAnimationFrame(heightFrame);
      const spacer = document.querySelector(SPACER);
      const before = spacer?.getBoundingClientRect().top ?? 0;
      land();
      if (target === null) root.removeAttribute('data-keyboard-open');
      else root.setAttribute('data-keyboard-open', '');
      const grow = target === null || (committed !== null && target > committed);
      if (grow) commit(target);
      const end = grow ? 0 : target - (committed ?? window.innerHeight);
      const start = before - (spacer?.getBoundingClientRect().top ?? 0);
      const finish = () => {
        if (!grow) commit(target);
        land();
        // 줄어든 본문 아래 경계 기준으로 입력란이 키보드 뒤에 남지 않게 한 번 더
        if (target !== null) revealFocused();
      };
      if (reducedMotion() || duration <= 0 || Math.abs(end - start) < 1) return finish();
      lifted = [...document.querySelectorAll<HTMLElement>(FOLLOWERS)];
      for (const element of lifted) element.style.willChange = 'transform';
      lift(start);
      // 본문 안 입력란이 열림 내내 키보드 뒤에 있다가 끝에 튀지 않게 줄어들 만큼 미리 스크롤
      // 본문이 아직 줄지 않아 스크롤할 범위가 없을 수 있어 그만큼 아래 여백을 먼저 늘림
      if (!grow) {
        makeRoom(-end);
        revealFocused(-end);
      }
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        if (progress === 1) return finish();
        lift(start + (end - start) * followEase(progress));
        heightFrame = requestAnimationFrame(step);
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
      // rAF가 넘기는 시각을 축소량으로 받지 않게 감쌈
      frame = requestAnimationFrame(() => revealFocused());
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
      land();
    };
  }, []);
  return null;
}

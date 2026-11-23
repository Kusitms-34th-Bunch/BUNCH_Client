import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const SAVE_DELAY_MS = 100;
// 복원 위치까지 높이가 생기길 기다리는 상한(댓글·목록 첫 응답)
const RESTORE_RETRY_CAP_MS = 5000;
const MOVING_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

/**
 * 스크롤 위치를 이 화면의 history 항목에 저장해 그 항목으로 돌아오면 복원(새 항목에는 값이 없어 맨 위)
 * `ready`: 목록이 그려져 높이가 생긴 뒤(그 전에 넣으면 브라우저가 0으로 줄임). 복원은 한 번만
 */
export function useScrollInHistory(anchorRef: RefObject<HTMLElement | null>, ready: boolean) {
  const restored = useRef(false);
  // 언마운트(Strict Mode의 흉내 포함) 뒤 다시 붙으면 다시 복원(떠날 때 붙잡기가 scrollTop을 0으로 둠)
  useLayoutEffect(
    () => () => {
      restored.current = false;
    },
    [],
  );
  // 아직 닿지 못한 복원 위치(늦게 오는 목록으로 높이가 모자라 잘림). 그동안은 잘린 값을 저장하지 않음
  const pending = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const main = anchorRef.current?.closest('main');
    const target = (window.history.state as { pageScroll?: number } | null)?.pageScroll;
    if (!main || !target) return;
    main.scrollTop = target;
    if (main.scrollTop >= target - 1) return;
    // 높이가 생길 때까지 프레임마다 다시 맞춤. 직접 조작하거나 닿거나 상한이 지나면 멈춤
    // data-scroll-restoring: 기다리는 동안 RouteFocus가 잘린 위치로 초점을 정하지 않게 하는 표식
    pending.current = target;
    main.dataset.scrollRestoring = '';
    const startedAt = performance.now();
    let frame = 0;
    let lastTop = main.scrollTop;
    const events = ['touchstart', 'wheel', 'keydown', 'pointerdown'] as const;
    const stop = () => {
      pending.current = null;
      delete main.dataset.scrollRestoring;
      cancelAnimationFrame(frame);
      events.forEach((name) => document.removeEventListener(name, stopOnInput, true));
    };
    // 키는 스크롤·초점을 옮기는 것만(Shift 같은 보조 키, 스크린 리더 키 조합은 제외)
    const stopOnInput = (event: Event) => {
      if (event instanceof KeyboardEvent && !MOVING_KEYS.has(event.key)) return;
      stop();
    };
    const retry = () => {
      // 터치 없이 다른 주체(스크린 리더 등)가 움직였으면 그 위치를 지키고 저장
      if (Math.abs(main.scrollTop - lastTop) > 1) {
        stop();
        const state = window.history.state as object | null;
        window.history.replaceState({ ...state, pageScroll: main.scrollTop }, '');
        return;
      }
      main.scrollTop = target;
      lastTop = main.scrollTop;
      if (lastTop >= target - 1 || performance.now() - startedAt > RESTORE_RETRY_CAP_MS)
        return stop();
      frame = requestAnimationFrame(retry);
    };
    events.forEach((name) => document.addEventListener(name, stopOnInput, true));
    frame = requestAnimationFrame(retry);
    return stop;
  }, [anchorRef, ready]);

  useEffect(() => {
    const main = anchorRef.current?.closest('main');
    if (!main) return;
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (pending.current !== null) return;
        const state = window.history.state as object | null;
        window.history.replaceState({ ...state, pageScroll: main.scrollTop }, '');
      }, SAVE_DELAY_MS);
    };
    main.addEventListener('scroll', save, { passive: true });
    return () => {
      window.clearTimeout(timer);
      main.removeEventListener('scroll', save);
    };
    // 받는 중 화면처럼 기준 요소가 없다가 생기면 그때 등록
  }, [anchorRef, ready]);
}

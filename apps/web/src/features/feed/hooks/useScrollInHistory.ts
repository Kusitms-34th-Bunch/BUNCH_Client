import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const SAVE_DELAY_MS = 100;

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
  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const main = anchorRef.current?.closest('main');
    const state = window.history.state as { feedScroll?: number } | null;
    if (main && state?.feedScroll) main.scrollTop = state.feedScroll;
  }, [anchorRef, ready]);

  useEffect(() => {
    const main = anchorRef.current?.closest('main');
    if (!main) return;
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const state = window.history.state as object | null;
        window.history.replaceState({ ...state, feedScroll: main.scrollTop }, '');
      }, SAVE_DELAY_MS);
    };
    main.addEventListener('scroll', save, { passive: true });
    return () => {
      window.clearTimeout(timer);
      main.removeEventListener('scroll', save);
    };
  }, [anchorRef]);
}

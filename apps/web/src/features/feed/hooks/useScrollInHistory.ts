import { useEffect, useLayoutEffect, type RefObject } from 'react';

const SAVE_DELAY_MS = 100;

/** 스크롤 위치를 이 화면의 history 항목에 저장해 그 항목으로 돌아오면 복원(새 항목에는 값이 없어 맨 위) */
export function useScrollInHistory(anchorRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const main = anchorRef.current?.closest('main');
    const state = window.history.state as { feedScroll?: number } | null;
    if (main && state?.feedScroll) main.scrollTop = state.feedScroll;
  }, [anchorRef]);

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

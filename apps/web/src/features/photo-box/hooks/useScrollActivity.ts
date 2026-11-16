import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { findScroller } from '../lib/dragSelect';

// 스크롤이 이 시간 안에 있었다면 누른 순간 목록이 움직이던 것(관성 스크롤을 멈추려는 터치)으로 봄
const SCROLL_SETTLE_MS = 100;

/** 영역을 감싼 스크롤 목록이 방금까지 움직이고 있었는지 확인하는 함수(관성 스크롤 중 터치를 선택으로 오인하지 않기 위함) */
export function useScrollActivity(containerRef: RefObject<HTMLElement | null>) {
  // 목록이 마지막으로 스크롤된 시각
  const lastScrollAtRef = useRef(0);
  const watchedScrollerRef = useRef<HTMLElement | undefined>(undefined);
  // 등록한 것과 해제하는 함수가 같은 참조여야 리스너가 지워지므로 렌더마다 새로 만들지 않음
  const handleScroll = useCallback(() => {
    lastScrollAtRef.current = Date.now();
  }, []);
  const watchScroller = useCallback(
    (scroller: HTMLElement | undefined) => {
      if (watchedScrollerRef.current === scroller) return;
      watchedScrollerRef.current?.removeEventListener('scroll', handleScroll);
      scroller?.addEventListener('scroll', handleScroll, { passive: true });
      watchedScrollerRef.current = scroller;
    },
    [handleScroll],
  );
  // 첫 터치가 관성 스크롤 중이어도 막을 수 있도록 마운트 때부터 감시하고, 목록이 나중에 길어지는 경우를 위해 누를 때도 다시 찾음
  useEffect(() => {
    watchScroller(findScroller(containerRef.current));
    return () => watchScroller(undefined);
  }, [containerRef, watchScroller]);

  return () => {
    watchScroller(findScroller(containerRef.current));
    return Date.now() - lastScrollAtRef.current < SCROLL_SETTLE_MS;
  };
}

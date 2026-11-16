import { type RefObject, useEffect, useRef } from 'react';
import { autoScrollStep, findScroller } from '../lib/dragSelect';

/**
 * 손가락이 영역을 감싼 스크롤 목록의 보이는 위·아래 가장자리에 있으면 그쪽으로 천천히 스크롤하는 rAF 반복
 * `getPointerY`가 undefined를 돌려주면 반복을 멈춤, 실제로 스크롤됐을 때만 `onScrolled`를 부름
 */
export function useEdgeAutoScroll(containerRef: RefObject<HTMLElement | null>) {
  const frameRef = useRef<number | undefined>(undefined);

  const stop = () => {
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
  };
  useEffect(() => stop, []);

  const start = (getPointerY: () => number | undefined, onScrolled: () => void) => {
    const scroller = findScroller(containerRef.current);
    if (!scroller) return;
    const tick = () => {
      const pointerY = getPointerY();
      if (pointerY === undefined) {
        frameRef.current = undefined;
        return;
      }
      const rect = scroller.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      const step = autoScrollStep(pointerY, top, bottom);
      if (step !== 0) {
        const before = scroller.scrollTop;
        scroller.scrollTop = before + step;
        if (scroller.scrollTop !== before) onScrolled();
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  return { start, stop };
}

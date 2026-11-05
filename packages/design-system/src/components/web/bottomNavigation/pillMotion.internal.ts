const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** 이동 200ms 기준 아이콘·라벨 활성 전환 시점 */
export const ARRIVE_MS = 150;
/** 누르고 있는 동안 알약 배율 */
export const HELD_SCALE = 1.12;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 놓는 순간의 배율을 이어받는 마무리 모션(300ms 이하) */
export const settlePill = (pill: HTMLElement | null, from: number) => {
  if (!pill || typeof pill.animate !== 'function' || prefersReducedMotion()) return;
  pill.animate(
    from > 1
      ? [{ scale: from, easing: EASE }, { scale: 0.95, offset: 0.45, easing: EASE }, { scale: 1 }]
      : [
          { scale: 1, easing: EASE },
          { scale: HELD_SCALE, offset: 0.35, easing: EASE },
          { scale: 0.95, offset: 0.7, easing: EASE },
          { scale: 1 },
        ],
    { duration: from > 1 ? 280 : 300 },
  );
};

'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

// Figma 설계서 「멤버카드 목록 이동 인터랙션」: Smart Animation, Gentle, 400ms
// Gentle(스프링 100·15·1)을 400ms 구간 곡선으로 근사한 값은 docs/architecture/motion.md의 팝오버 메뉴와 같음
const DURATION_MS = 400;
const EASING = 'cubic-bezier(0.22, 0, 0.4, 0.94)';

/** Figma 「사진 삭제 인터랙션」: Smart Animate, Slow, 350ms. Slow(스프링 80·20·1)는 과감쇠라 0.92초에 99%에 닿으므로 350ms 구간으로 압축한 곡선에 맞춤(오차 0.6% 이내) */
export const SLOW_MOVE = { durationMs: 350, easing: 'cubic-bezier(0.24, 0.3, 0.14, 1)' } as const;

type MoveAnimationOptions = {
  durationMs?: number;
  easing?: string;
};

/**
 * 목록 항목이 다른 목록으로 옮겨가거나 밀려날 때 이전 위치에서 새 위치로 부드럽게 이동(FLIP)
 * 상태를 바꾸기 직전에 `capture()`로 위치를 기억해 두면, 다음 렌더 직후 달라진 위치만큼 `transform`으로 이동함
 * 동작 줄이기에서는 이동하지 않고, 항목은 `register(id)`를 ref로 달아 등록
 */
export function useMoveAnimation({
  durationMs = DURATION_MS,
  easing = EASING,
}: MoveAnimationOptions = {}) {
  const elements = useRef(new Map<string, HTMLElement>());
  const before = useRef<Map<string, DOMRect> | undefined>(undefined);

  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) elements.current.set(id, element);
      else elements.current.delete(id);
    },
    [],
  );

  const capture = useCallback(() => {
    // 이동 중인 카드를 끝 위치로 마무리해야 위치가 어긋나지 않음
    for (const element of elements.current.values()) {
      element.getAnimations?.().forEach((animation) => animation.finish());
    }
    before.current = new Map(
      [...elements.current].map(([id, element]) => [id, element.getBoundingClientRect()]),
    );
  }, []);

  // 렌더마다 확인: 기억해 둔 위치가 있을 때만 움직임
  useLayoutEffect(() => {
    const previous = before.current;
    before.current = undefined;
    if (!previous || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [id, element] of elements.current) {
      const from = previous.get(id);
      if (!from || typeof element.animate !== 'function') continue;
      const to = element.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (dx === 0 && dy === 0) continue;
      element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: durationMs, easing },
      );
    }
  });

  return { register, capture };
}

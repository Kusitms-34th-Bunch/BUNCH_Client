'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CONFETTI_DURATION_MS,
  CONFETTI_FRAME,
  CONFETTI_OPACITY_EASING,
  CONFETTI_OPACITY_TIMES_MS,
  CONFETTI_PIECES,
  CONFETTI_PIECE_SIZE,
  CONFETTI_ROTATION_END_MS,
} from '../constants/confetti';

const BEZIER = 'cubic-bezier(0.5, 0, 0.5, 1)';
const at = (timeMs: number) => timeMs / CONFETTI_DURATION_MS;

// 부모의 relative 좌표계를 사용하며 동작 줄이기 설정 시 렌더링 생략
export function BunchConfetti() {
  const pieceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const elements = pieceRefs.current;
    if (
      typeof elements[0]?.animate !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFinished(true);
      return;
    }

    const animations = CONFETTI_PIECES.flatMap((piece, index) => {
      const element = elements[index];
      if (!element) return [];
      const [from, to] = piece.rotation;
      const opacityTimes = piece.opacityTimesMs ?? CONFETTI_OPACITY_TIMES_MS;
      const last = piece.path.at(-1);
      const options = { duration: CONFETTI_DURATION_MS, fill: 'both' } as const;

      return [
        element.animate(
          [
            ...piece.path.map(([time, x, y]) => ({
              offset: at(time),
              translate: `${x}px ${y}px`,
            })),
            { offset: 1, translate: `${last?.[1] ?? 0}px ${last?.[2] ?? 0}px` },
          ],
          options,
        ),
        element.animate(
          [
            { offset: 0, rotate: `${from}rad`, easing: BEZIER },
            { offset: at(CONFETTI_ROTATION_END_MS), rotate: `${to}rad` },
            { offset: 1, rotate: `${to}rad` },
          ],
          options,
        ),
        element.animate(
          [
            { offset: 0, opacity: 0, easing: CONFETTI_OPACITY_EASING },
            { offset: at(opacityTimes[1]), opacity: 1 },
            { offset: at(opacityTimes[2]), opacity: 1, easing: CONFETTI_OPACITY_EASING },
            { offset: at(opacityTimes[3]), opacity: 0 },
            { offset: 1, opacity: 0 },
          ],
          options,
        ),
      ];
    });

    // 애니메이션 종료 후 DOM 정리(화면 이탈로 인한 취소는 무시)
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => setFinished(true))
      .catch(() => undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  if (finished) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 고정 크기 아바타·제목에 맞춰 Figma 틀(375×591)의 가운데 정렬 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: CONFETTI_FRAME.width, height: CONFETTI_FRAME.height }}
      >
        {CONFETTI_PIECES.map((piece, index) => (
          <span
            key={piece.id}
            ref={(element) => {
              pieceRefs.current[index] = element;
            }}
            className="absolute top-0 left-0 origin-top-left opacity-0"
            style={{
              width: CONFETTI_PIECE_SIZE.width,
              height: CONFETTI_PIECE_SIZE.height,
              backgroundColor: piece.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

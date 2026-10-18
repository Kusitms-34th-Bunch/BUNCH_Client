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
} from '../../constants/confetti';

const BEZIER = 'cubic-bezier(0.5, 0, 0.5, 1)';
const at = (timeMs: number) => timeMs / CONFETTI_DURATION_MS;

/**
 * 번치 생성 완료 화면에서 한 번 터지는 폭죽. 끝나면 스스로 사라짐
 * 위치(`translate`)·회전(`rotate`)·불투명도를 각각 Web Animations API로 재생(transform·opacity만 사용)
 * `prefers-reduced-motion: reduce`이면 그리지 않음. 부모는 `relative`여야 함
 */
export function CreateBunchConfetti() {
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

    // 끝난 폭죽은 DOM에서 치움(취소되면 이 화면이 사라지는 중이라 무시)
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => setFinished(true))
      .catch(() => undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  if (finished) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 아바타·제목이 고정 크기라 폭에 따라 키우지 않고 Figma 틀(375×591)의 가운데를 본문 가운데에 맞춤 */}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { CONFETTI_DURATION_MS, CONFETTI_FRAME, CONFETTI_PIECES } from '../constants/confetti';
import { confettiKeyframes } from '../lib/confettiKeyframes';

type PieceRefs = {
  x: HTMLSpanElement | null;
  y: HTMLSpanElement | null;
  body: HTMLSpanElement | null;
};

const OPTIONS = { duration: CONFETTI_DURATION_MS, fill: 'both' } as const;

// 부모의 relative 좌표계를 사용하며 동작 줄이기 설정 시 렌더링 생략
export function BunchConfetti() {
  const pieceRefs = useRef<PieceRefs[]>(
    CONFETTI_PIECES.map(() => ({ x: null, y: null, body: null })),
  );
  const [finished, setFinished] = useState(false);
  const attach = (index: number, key: keyof PieceRefs) => (element: HTMLSpanElement | null) => {
    const refs = pieceRefs.current[index];
    if (refs) refs[key] = element;
  };

  useEffect(() => {
    const pieces = pieceRefs.current;
    if (
      typeof pieces[0]?.body?.animate !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFinished(true);
      return;
    }

    const animations = CONFETTI_PIECES.flatMap((piece, index) => {
      const refs = pieces[index];
      if (!refs?.x || !refs.y || !refs.body) return [];
      const keyframes = confettiKeyframes(piece);

      return [
        // 가로·세로 이동은 시각과 곡선이 달라 요소를 나눠 각각 재생
        refs.x.animate(keyframes.translateX, OPTIONS),
        refs.y.animate(keyframes.translateY, OPTIONS),
        refs.body.animate(keyframes.rotate, OPTIONS),
        refs.body.animate(keyframes.scale, OPTIONS),
        refs.body.animate(keyframes.opacity, OPTIONS),
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
      {/* 고정 크기 아바타·제목에 맞춰 Figma 틀(375×624)의 가운데 정렬 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: CONFETTI_FRAME.width, height: CONFETTI_FRAME.height }}
      >
        {CONFETTI_PIECES.map((piece, index) => (
          <span
            key={piece.id}
            ref={attach(index, 'x')}
            className="absolute"
            style={{ left: piece.left, top: piece.top, width: piece.size, height: piece.size }}
          >
            <span ref={attach(index, 'y')} className="block size-full">
              <span
                ref={attach(index, 'body')}
                className="block size-full opacity-0"
                style={{ backgroundColor: piece.color }}
              />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

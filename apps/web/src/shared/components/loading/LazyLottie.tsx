'use client';

import { useEffect, useState } from 'react';
import type { LoadedLottie } from '@/shared/lib/lottieLoader';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const lastFrame = (data: object): [number, number] => {
  const end = 'op' in data && typeof data.op === 'number' ? data.op : 1;
  return [end - 1, end];
};

/**
 * 마운트되면 받아 재생하는 장식 로티(기본 반복). 받는 동안과 받지 못했을 때는 빈 자리(크기는 `className`)
 * `prefers-reduced-motion`이면 재생 없이 `stillFrame` 한 장만 보임(기본 첫 프레임, 나타나는 모션은 `last`)
 */
export function LazyLottie({
  load,
  className,
  loop = true,
  stillFrame = 'first',
}: {
  load: () => Promise<LoadedLottie>;
  className: string;
  loop?: boolean;
  stillFrame?: 'first' | 'last';
}) {
  const [loaded, setLoaded] = useState<LoadedLottie | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;
    load().then(
      (lottie) => {
        if (alive) setLoaded(lottie);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [load]);

  return (
    <span aria-hidden="true" className={className}>
      {loaded ? (
        <loaded.Player
          src={loaded.data}
          autoplay={!reducedMotion}
          loop={loop && !reducedMotion}
          // 멈춘 채 마지막 장면만(나타나는 모션은 첫 프레임이 비어 있음)
          {...(reducedMotion && stillFrame === 'last' ? { segment: lastFrame(loaded.data) } : {})}
          className="size-full"
        />
      ) : null}
    </span>
  );
}

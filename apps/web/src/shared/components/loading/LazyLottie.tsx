'use client';

import { useEffect, useState } from 'react';
import type { LoadedLottie } from '@/shared/lib/lottieLoader';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

/**
 * 처음 보일 때 받아 반복 재생하는 장식 로티. 받는 동안과 받지 못했을 때는 빈 자리(크기는 `className`)
 * `prefers-reduced-motion`이면 재생과 반복 없이 첫 프레임만 보임
 */
export function LazyLottie({
  load,
  className,
}: {
  load: () => Promise<LoadedLottie>;
  className: string;
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
          loop={!reducedMotion}
          className="size-full"
        />
      ) : null}
    </span>
  );
}

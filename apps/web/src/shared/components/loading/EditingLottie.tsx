'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LottieLight } from '@/shared/lib/lottieLight';

type LottiePlayer = typeof LottieLight;
type LoadedLottie = { Player: LottiePlayer; data: object };

// 엔진과 JSON은 모듈에서 한 번만 받아 다시 표시할 때 재다운로드 방지(실패하면 다음 표시 때 재시도)
let loading: Promise<LoadedLottie> | undefined;
const loadLottie = () => {
  loading ??= Promise.all([
    import('@/shared/lib/lottieLight'),
    import('@/shared/assets/lotties/editing.json'),
  ])
    .then(([library, animation]) => ({ Player: library.LottieLight, data: animation.default }))
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  return loading;
};

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
// hydration 불일치 방지를 위해 서버·첫 렌더에서는 움직임 없는 상태로 취급
const getServerReducedMotion = () => true;

/**
 * 다른 멤버가 편집 중인 영역의 점 3개(공동 편집 표시, 디자이너 전달 `editing.json` 30×25)
 * 엔진(light)과 JSON은 처음 보일 때 동적으로 받고, 받는 동안과 받지 못했을 때는 빈 자리(크기 고정)
 * `prefers-reduced-motion`이면 재생과 반복 없이 첫 프레임만 보임. 장식이라 읽어 줄 문구는 호출하는 쪽이 정함
 */
export function EditingLottie() {
  const [loaded, setLoaded] = useState<LoadedLottie | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  useEffect(() => {
    let alive = true;
    loadLottie().then(
      (lottie) => {
        if (alive) setLoaded(lottie);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <span aria-hidden="true" className="block h-6.25 w-7.5 shrink-0">
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

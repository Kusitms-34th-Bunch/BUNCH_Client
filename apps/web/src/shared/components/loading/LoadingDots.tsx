'use client';

import { EditingAnimation } from '@app/design-system/web';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LottieLight } from '@/shared/lib/lottieLight';

type LottiePlayer = typeof LottieLight;
type LoadedLottie = { Player: LottiePlayer; data: object };

// 엔진과 JSON은 모듈에서 한 번만 받아 다시 표시할 때 재다운로드 방지(실패하면 다음 표시 때 재시도)
let loading: Promise<LoadedLottie> | undefined;
const loadLottie = () => {
  loading ??= Promise.all([
    import('@/shared/lib/lottieLight'),
    import('@/shared/assets/lotties/loading.json'),
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
 * 로딩 상태의 점 3개(앱 공통 로딩 표시, 디자이너 전달 `loading.json`, 원본 70×28을 1.6배인 112×45로 그려 점 지름 약 8.8px, Figma 사진함_12는 9.3px)
 * 엔진(light)과 JSON은 처음 보일 때 동적으로 받고, 받는 동안은 빈 자리(크기 고정)이며 받지 못하면 `EditingAnimation`으로 대체
 * `prefers-reduced-motion`이면 재생과 반복 없이 첫 프레임(점이 가지런한 모양)만 보임. 장식이라 상태 안내는 화면의 live region이 담당
 */
export function LoadingDots() {
  const [loaded, setLoaded] = useState<LoadedLottie | 'failed' | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  useEffect(() => {
    let alive = true;
    loadLottie()
      .then((lottie) => {
        if (alive) setLoaded(lottie);
      })
      .catch(() => {
        if (alive) setLoaded('failed');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loaded === 'failed') return <EditingAnimation />;

  return (
    <span aria-hidden="true" className="block h-[45px] w-28">
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

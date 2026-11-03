import type { LottieLight } from './lottieLight';

export type LoadedLottie = { Player: typeof LottieLight; data: object };

/** 엔진과 JSON을 모듈에서 한 번만 받는 로더(다시 표시할 때 재다운로드 방지, 실패하면 다음 표시 때 재시도) */
export function createLottieLoader(loadData: () => Promise<{ default: object }>) {
  let loading: Promise<LoadedLottie> | undefined;
  return () => {
    loading ??= Promise.all([import('./lottieLight'), loadData()])
      .then(([library, animation]) => ({ Player: library.LottieLight, data: animation.default }))
      .catch((error: unknown) => {
        loading = undefined;
        throw error;
      });
    return loading;
  };
}

'use client';

import { createLottieLoader } from '@/shared/lib/lottieLoader';
import { LazyLottie } from './LazyLottie';

const loadLoading = createLottieLoader(() => import('@/shared/assets/lotties/loading.json'));

/**
 * 로딩 상태의 점 3개(앱 공통 로딩 표시, 디자이너 전달 `loading.json`, 원본 70×28을 1.6배인 112×45로 그려 점 지름 약 8.8px, Figma 사진함_12는 9.3px)
 * 동작 줄이기에서는 첫 프레임(점이 가지런한 모양)만 보임. 장식이라 상태 안내는 화면의 live region이 담당
 */
export function LoadingDots() {
  return <LazyLottie load={loadLoading} className="block h-11.25 w-28" />;
}

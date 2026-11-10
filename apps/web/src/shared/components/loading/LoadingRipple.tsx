'use client';

import { createLottieLoader } from '@/shared/lib/lottieLoader';
import { LazyLottie } from './LazyLottie';

const loadRipple = createLottieLoader(() => import('@/shared/assets/lotties/loading.json'));

/**
 * 로딩 상태의 물결 모양 점 패턴(앱 공통 로딩 표시, 디자이너 전달 `loading.json`, 원본 90×90 그대로)
 * 동작 줄이기에서는 첫 프레임만 보임. 장식이라 상태 안내는 화면의 live region이 담당
 */
export function LoadingRipple() {
  return <LazyLottie load={loadRipple} className="block size-22.5" />;
}

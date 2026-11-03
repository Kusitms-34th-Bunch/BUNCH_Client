'use client';

import { createLottieLoader } from '@/shared/lib/lottieLoader';
import { LazyLottie } from './LazyLottie';

const loadEditing = createLottieLoader(() => import('@/shared/assets/lotties/editing.json'));

/** 다른 멤버가 편집 중인 영역의 점 3개(공동 편집 표시, 디자이너 전달 `editing.json` 30×25). 장식이라 읽어 줄 문구는 호출하는 쪽이 정함 */
export function EditingLottie() {
  return <LazyLottie load={loadEditing} className="block h-6.25 w-7.5 shrink-0" />;
}

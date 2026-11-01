'use client';

import type { ReactNode } from 'react';
import { BundleSelectProvider } from '../contexts/BundleSelectProvider';

/** `/bunch/bundles/new` 아래 모든 화면(사진 선택·추천 상세·뷰어)이 같은 선택 상태를 쓰도록 layout에서 provider를 한 번 둠 */
export function BundleSelectLayout({ children }: { children: ReactNode }) {
  return <BundleSelectProvider>{children}</BundleSelectProvider>;
}

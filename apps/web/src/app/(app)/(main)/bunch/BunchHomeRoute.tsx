'use client';

import { BunchHome } from '@/features/bunch-home/components';
import { usePrefetchBundleDetail } from '@/features/feed/queries/bundleDetail';

/** 번치 홈 그리드 → 번들 상세 전 삭제 여부 확인(feed의 상세 query를 route에서 조합) */
export function BunchHomeRoute({ initialTab }: { initialTab: 'completed' | 'draft' }) {
  const prefetchBundle = usePrefetchBundleDetail();
  return <BunchHome initialTab={initialTab} prefetchBundle={prefetchBundle} />;
}

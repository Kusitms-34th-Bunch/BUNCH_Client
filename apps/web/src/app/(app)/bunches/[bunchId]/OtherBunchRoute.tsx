'use client';

import { OtherBunch } from '@/features/bunch-home/components';
import { rememberGridBundlePreview } from '@/features/feed/lib/bundlePreview';
import { usePrefetchBundleDetail } from '@/features/feed/queries/bundleDetail';

/** 다른 번치 그리드 → 번들 상세 전 삭제 여부 확인(feed의 상세 query·미리보기를 route에서 조합) */
export function OtherBunchRoute({ bunchId }: { bunchId: string }) {
  const prefetchBundle = usePrefetchBundleDetail();
  return (
    <OtherBunch
      bunchId={bunchId}
      prefetchBundle={prefetchBundle}
      rememberPreview={rememberGridBundlePreview}
    />
  );
}

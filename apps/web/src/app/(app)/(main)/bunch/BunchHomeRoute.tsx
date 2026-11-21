'use client';

import { BunchHome } from '@/features/bunch-home/components';
import { usePrefetchPinnedPlaces } from '@/features/bunch-places/queries/pinnedPlaces';
import { rememberGridBundlePreview } from '@/features/feed/lib/bundlePreview';
import { usePrefetchBundleDetail } from '@/features/feed/queries/bundleDetail';

/** 번치 홈 그리드 → 번들 상세 전 삭제 여부 확인(feed의 상세 query·미리보기, bunch-places의 장소 미리 받기를 route에서 조합) */
export function BunchHomeRoute({ initialTab }: { initialTab: 'completed' | 'draft' }) {
  const prefetchBundle = usePrefetchBundleDetail();
  const prefetchPlaces = usePrefetchPinnedPlaces();
  return (
    <BunchHome
      initialTab={initialTab}
      prefetchBundle={prefetchBundle}
      rememberPreview={rememberGridBundlePreview}
      prefetchPlaces={prefetchPlaces}
    />
  );
}

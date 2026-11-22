'use client';

import { BunchHome } from '@/features/bunch-home/components';
import { usePrefetchOtherBunchHome } from '@/features/bunch-home/queries/otherBunch';
import { usePrefetchPinnedPlaces } from '@/features/bunch-places/queries/pinnedPlaces';
import { rememberGridBundlePreview } from '@/features/feed/lib/bundlePreview';
import { usePrefetchBundleDetail } from '@/features/feed/queries/bundleDetail';

/** 번치 홈 그리드 → 번들 상세 전 삭제 여부 확인(feed의 상세 query·미리보기, bunch-places의 장소 미리 받기를 route에서 조합) */
export function BunchHomeRoute({ initialTab }: { initialTab: 'completed' | 'draft' }) {
  const prefetchDetail = usePrefetchBundleDetail();
  const prefetchBunch = usePrefetchOtherBunchHome();
  const prefetchPlaces = usePrefetchPinnedPlaces();
  // 상세 화면은 번들 상세와 번치 정보(이름·이미지)가 모두 있어야 본문을 그림. 번치 정보가 없으면 칸 데이터로 먼저 그린 화면을 거쳐 hero 착지 자리가 달라짐
  // 번치 정보 실패는 이동을 막지 않고, 삭제 여부는 상세 응답으로만 판단
  const prefetchBundle = (bunchId: string, bundleId: string, viewerId: string | null) =>
    Promise.all([
      prefetchDetail(bunchId, bundleId, viewerId),
      prefetchBunch(bunchId, viewerId).catch(() => undefined),
    ]);
  return (
    <BunchHome
      initialTab={initialTab}
      prefetchBundle={prefetchBundle}
      rememberPreview={rememberGridBundlePreview}
      prefetchPlaces={prefetchPlaces}
    />
  );
}

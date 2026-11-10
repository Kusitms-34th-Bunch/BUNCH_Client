'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { replaceUrl } from '@/shared/lib/replaceUrl';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';
import { getRecommendationPhotos } from '../../lib/recommendation';
import { RecommendViewerScreen } from './RecommendViewerScreen';

type RecommendViewerProps = {
  /** route에서 형식을 검증한 추천 번들 id와 사진 id. 형식이 틀렸으면 undefined */
  recommendationId: string | undefined;
  photoId: string | undefined;
};

/**
 * `/bunch/bundles/new/recommendations/[recommendationId]/photos/[photoId]` 추천 사진 뷰어
 * 추천이나 사진이 사라졌으면 안내 토스트 뒤 사진 선택 화면으로 돌아가 시트 목록을 다시 보여 줌
 */
export function RecommendViewer({ recommendationId, photoId }: RecommendViewerProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { photoState, recommendations, openSheet, memberIds } = useBundleSelect();
  // 새로고침·직접 주소로 들어와 멤버를 고르지 않았으면 사진 선택을 거치지 않고 첫 단계로 보냄
  const noMembers = memberIds.length === 0;
  const data = photoState.kind === 'ready' ? photoState.data : undefined;
  const recommendation = recommendations.find((item) => item.id === recommendationId);
  const photos = data && recommendation ? getRecommendationPhotos(recommendation, data.photos) : [];
  const present = photoId !== undefined && photos.some((photo) => photo.id === photoId);
  const missing = data !== undefined && !present;
  // 사진함을 못 불러오면(오류·번치 없음) 로딩에 갇히지 않게 사진 선택 화면이 보여 주는 안내로 보냄
  const unavailable = photoState.kind === 'error' || photoState.kind === 'no-bunch';

  useEffect(() => {
    if (noMembers) router.replace(BUNDLE_SELECT_PATHS.members);
    else if (unavailable) router.replace(BUNDLE_SELECT_PATHS.select);
  }, [noMembers, unavailable, router]);

  useEffect(() => {
    // 멤버가 없으면 위 effect가 첫 단계로 보내므로 삭제 안내·시트 열기는 하지 않음
    if (!missing || noMembers) return;
    toastAfterNavigation(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
    openSheet();
    router.replace(BUNDLE_SELECT_PATHS.select);
  }, [missing, noMembers, openSheet, router]);

  if (!data || !recommendation || !present || photoId === undefined) return <PageLoading />;

  return (
    <RecommendViewerScreen
      photos={photos}
      members={data.members}
      initialPhotoId={photoId}
      onBack={() => backOr(BUNDLE_SELECT_PATHS.recommendation(recommendation.id))}
      // 넘길 때마다 Next 이동 없이 주소만 맞춰 새로고침·공유가 현재 사진을 가리키게 함
      onPhotoChange={(id) => replaceUrl(BUNDLE_SELECT_PATHS.viewer(recommendation.id, id))}
    />
  );
}

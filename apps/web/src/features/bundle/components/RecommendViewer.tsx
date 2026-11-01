'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useBundleSelect } from '../contexts/bundleSelectContext';
import { getRecommendationPhotos } from '../lib/recommendation';
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
  const { photoState, recommendations, openSheet } = useBundleSelect();
  const data = photoState.kind === 'ready' ? photoState.data : undefined;
  const recommendation = recommendations.find((item) => item.id === recommendationId);
  const photos = data && recommendation ? getRecommendationPhotos(recommendation, data.photos) : [];
  const present = photoId !== undefined && photos.some((photo) => photo.id === photoId);
  const missing = data !== undefined && !present;
  // 사진함을 못 불러오면(오류·번치 없음) 로딩에 갇히지 않게 사진 선택 화면이 보여 주는 안내로 보냄
  const unavailable = photoState.kind === 'error' || photoState.kind === 'no-bunch';

  useEffect(() => {
    if (unavailable) router.replace(BUNDLE_SELECT_PATHS.select);
  }, [unavailable, router]);

  useEffect(() => {
    if (!missing) return;
    toast(BUNDLE_SELECT_MESSAGES.deletedRecommendation, { fullWidth: true });
    openSheet();
    router.replace(BUNDLE_SELECT_PATHS.select);
  }, [missing, openSheet, router]);

  if (!data || !recommendation || !present || photoId === undefined) return <PageLoading />;

  return (
    <RecommendViewerScreen
      photos={photos}
      members={data.members}
      initialPhotoId={photoId}
      onBack={() =>
        window.history.length > 1
          ? router.back()
          : router.replace(BUNDLE_SELECT_PATHS.recommendation(recommendation.id))
      }
      // 넘길 때마다 Next 이동 없이 주소만 맞춰 새로고침·공유가 현재 사진을 가리키게 함
      onPhotoChange={(id) =>
        window.history.replaceState(
          window.history.state,
          '',
          BUNDLE_SELECT_PATHS.viewer(recommendation.id, id),
        )
      }
    />
  );
}

'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useBundleSelect } from '../contexts/bundleSelectContext';
import { getRecommendationPhotos, groupByDate } from '../lib/recommendation';
import { RecommendDetailScreen } from './RecommendDetailScreen';

type RecommendDetailProps = {
  /** route에서 형식을 검증한 추천 번들 id. 형식이 틀렸으면 undefined */
  recommendationId: string | undefined;
};

/**
 * `/bunch/bundles/new/recommendations/[recommendationId]` 추천 번들 상세: 추천 사진을 날짜별로 보여 주는 보기 전용 화면
 * 없는 추천(삭제됨·잘못된 id)은 안내 토스트 뒤 사진 선택 화면으로 돌아가 시트 목록을 다시 보여 줌
 */
export function RecommendDetail({ recommendationId }: RecommendDetailProps) {
  const router = useRouter();
  const { photoState, recommendations, openSheet } = useBundleSelect();
  const photos = photoState.kind === 'ready' ? photoState.data.photos : undefined;
  const recommendation = recommendations.find((item) => item.id === recommendationId);
  const missing = photos !== undefined && recommendation === undefined;
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

  if (!photos || !recommendation) return <PageLoading />;

  return (
    <RecommendDetailScreen
      recommendation={recommendation}
      sections={groupByDate(
        getRecommendationPhotos(recommendation, photos),
        new Date().getFullYear(),
      )}
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNDLE_SELECT_PATHS.select)
      }
    />
  );
}

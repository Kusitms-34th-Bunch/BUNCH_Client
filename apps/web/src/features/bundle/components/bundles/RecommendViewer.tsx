'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { replaceUrl } from '@/shared/lib/replaceUrl';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';
import { useRecommendationDetail } from '../../hooks/useRecommendations';
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
  const { openSheet, memberIds } = useBundleSelect();
  const state = useRecommendationDetail(recommendationId);
  // 새로고침·직접 주소로 들어와 멤버를 고르지 않았으면 사진 선택을 거치지 않고 첫 단계로 보냄
  const noMembers = memberIds.length === 0;
  const detail = state.kind === 'ready' ? state.detail : undefined;
  // 뷰어는 원본 비율 사진을 보여 줌(그리드의 사진 주소는 정사각 썸네일)
  const photos = (detail?.photos ?? []).map((photo) => ({
    ...photo,
    src: detail?.originalSrcById[photo.id] ?? photo.src,
  }));
  const present = photoId !== undefined && photos.some((photo) => photo.id === photoId);
  // 추천이 삭제됐거나 그 사이 이 사진이 빠졌으면 안내 후 목록으로, 불러오지 못했으면 로딩에 갇히지 않게 사진 선택 화면으로 보냄
  const missing = state.kind === 'deleted' || (detail !== undefined && !present);
  const unavailable = state.kind === 'error';

  useEffect(() => {
    if (noMembers) router.replace(BUNDLE_SELECT_PATHS.members);
    else if (unavailable) {
      // 이유 없이 화면이 바뀌지 않게 불러오지 못했다고 알림
      toastAfterNavigation(BUNDLE_SELECT_MESSAGES.recommendationsFailed);
      router.replace(BUNDLE_SELECT_PATHS.select);
    }
  }, [noMembers, unavailable, router]);

  useEffect(() => {
    // 멤버가 없으면 위 effect가 첫 단계로 보내므로 삭제 안내·시트 열기는 하지 않음
    if (!missing || noMembers) return;
    toastAfterNavigation(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
    openSheet();
    router.replace(BUNDLE_SELECT_PATHS.select);
  }, [missing, noMembers, openSheet, router]);

  if (!detail || !present || photoId === undefined)
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

  return (
    <RecommendViewerScreen
      photos={photos}
      members={detail.members}
      initialPhotoId={photoId}
      onBack={() => backOr(BUNDLE_SELECT_PATHS.recommendation(detail.id))}
      // 넘길 때마다 Next 이동 없이 주소만 맞춰 새로고침·공유가 현재 사진을 가리키게 함
      onPhotoChange={(id) => replaceUrl(BUNDLE_SELECT_PATHS.viewer(detail.id, id))}
    />
  );
}

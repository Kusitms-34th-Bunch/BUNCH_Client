'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useCurrentYear } from '@/shared/hooks/useCurrentYear';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';
import { useRecommendationDetail } from '../../hooks/useRecommendations';
import { groupByDate } from '../../lib/recommendation';
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
  const backOr = useBackOr();
  const currentYear = useCurrentYear();
  const { openSheet, memberIds } = useBundleSelect();
  const state = useRecommendationDetail(recommendationId);
  // 새로고침·직접 주소로 들어와 멤버를 고르지 않았으면 사진 선택을 거치지 않고 첫 단계로 보냄
  const noMembers = memberIds.length === 0;
  // 삭제됐거나 잘못된 id면 안내 후 목록으로, 불러오지 못했으면 로딩에 갇히지 않게 사진 선택 화면으로 보냄
  const missing = state.kind === 'deleted';
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

  if (state.kind !== 'ready')
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;
  const { detail } = state;

  return (
    <RecommendDetailScreen
      recommendation={detail}
      sections={groupByDate(detail.photos, currentYear)}
      onBack={() => backOr(BUNDLE_SELECT_PATHS.select)}
    />
  );
}

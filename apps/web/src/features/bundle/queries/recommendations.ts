import { queryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { getRecommendation, getRecommendations } from '../api/recommendations';
import { bundleKeys } from './keys';

/** 추천 번들 목록. 번치를 아직 모르면 요청하지 않음(skipToken) */
export const recommendationsQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: bundleKeys.recommendations(bunchId),
    queryFn: bunchId ? ({ signal }) => getRecommendations(bunchId, signal) : skipToken,
    // 추천은 사진이 바뀌면 서버가 다시 계산해 늘 최신을 봐야 하므로 열 때마다 다시 받음
    staleTime: 0,
  });

/** 추천 번들 상세. 진입할 때마다 최신 사진을 다시 받음(기능 명세 4.2.5) */
export const recommendationQueryOptions = (bunchId: string | undefined, id: string | undefined) =>
  queryOptions({
    queryKey: bundleKeys.recommendation(bunchId, id),
    queryFn: bunchId && id ? ({ signal }) => getRecommendation(bunchId, id, signal) : skipToken,
    staleTime: 0,
  });

/** 호출할 때마다 서버에서 최신을 받아 오는 함수(시트를 열 때, 카드를 눌러 적용할 때). 번치를 모르면 요청하지 않고 거절 */
export const useRecommendationFetchers = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return {
    fetchList: () => queryClient.fetchQuery(recommendationsQueryOptions(bunchId)),
    fetchDetail: (id: string) => queryClient.fetchQuery(recommendationQueryOptions(bunchId, id)),
  };
};

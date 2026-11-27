'use client';

import { useQuery } from '@tanstack/react-query';
import { apiErrorCode } from '@/shared/api/client/errorStatus';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { Recommendation, RecommendationDetail } from '../model/recommendation';
import { recommendationQueryOptions, useRecommendationFetchers } from '../queries/recommendations';

/** 없거나 삭제된 추천 번들(RESOURCE_001)인지. 다른 번치의 추천 번호도 같은 코드 */
const isDeleted = (error: unknown) => apiErrorCode(error) === 'RESOURCE_001';

/** 추천 번들을 불러오는 쪽이 받는 결과: 삭제됨(404)과 그 밖의 실패를 구분 */
export type RecommendationLoad<T> =
  | { kind: 'ready'; data: T }
  | { kind: 'deleted' }
  | { kind: 'failed' };

/**
 * 번들 만들기 흐름이 추천 번들 목록과 상세를 그때그때 최신으로 받는 동작(시트를 열 때, 카드를 눌러 적용할 때)
 * 추천은 서버가 사진 변경 몇 분 뒤 다시 계산하므로 캐시를 쓰지 않고 호출마다 서버에서 받음
 */
export function useRecommendationLoader() {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const { fetchList, fetchDetail } = useRecommendationFetchers(bunchId);

  const loadList = async (): Promise<RecommendationLoad<readonly Recommendation[]>> => {
    if (!bunchId) return { kind: 'failed' };
    try {
      return { kind: 'ready', data: await fetchList() };
    } catch {
      return { kind: 'failed' };
    }
  };

  const loadDetail = async (id: string): Promise<RecommendationLoad<RecommendationDetail>> => {
    if (!bunchId) return { kind: 'failed' };
    try {
      return {
        kind: 'ready',
        data: await fetchDetail(id),
      };
    } catch (error) {
      return { kind: isDeleted(error) ? 'deleted' : 'failed' };
    }
  };

  return { loadList, loadDetail };
}

/** 추천 상세·뷰어 화면의 상태 */
export type RecommendationDetailState =
  | { kind: 'loading' }
  | { kind: 'deleted' }
  | { kind: 'error' }
  | { kind: 'ready'; detail: RecommendationDetail };

/** 추천 번들 상세(진입할 때마다 최신 사진을 다시 받음). id가 잘못된 형식이면 요청하지 않고 삭제된 것으로 봄 */
export function useRecommendationDetail(id: string | undefined): RecommendationDetailState {
  const profile = useQuery(myProfileQueryOptions());
  const bunchId = profile.data?.bunch?.id;
  const query = useQuery(recommendationQueryOptions(bunchId, id));
  if (id === undefined) return { kind: 'deleted' };
  // 이전에 받은 값이 남아 있어도 다시 받다가 삭제됐다고 하면 삭제로 봄
  if (query.isError && isDeleted(query.error)) return { kind: 'deleted' };
  if (query.data) return { kind: 'ready', detail: query.data };
  if (query.isError) return { kind: 'error' };
  // 프로필을 받지 못했거나 번치가 없으면 요청이 나가지 않아 로딩에 갇히므로 오류로 알림
  if (profile.isError || (profile.isSuccess && bunchId === undefined)) return { kind: 'error' };
  return { kind: 'loading' };
}

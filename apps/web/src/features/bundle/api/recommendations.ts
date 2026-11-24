import { ApiError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { toWireId } from '@/shared/api/client/ids';
import {
  recommendationDetailSchema,
  recommendationListSchema,
  toRecommendation,
  toRecommendationDetail,
} from '../model/recommendation';

const listPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}/recommended-bundles`;

/** 추천 번들 카드 목록(서버 순서 그대로, 개수 제한 없음). 번치의 활성 멤버만 호출 가능(AUTH_002) */
export const getRecommendations = async (bunchId: string, signal?: AbortSignal) => {
  const list = await requestData(
    bffApi.get(listPath(bunchId), { signal: signal ?? null }),
    recommendationListSchema,
    'recommendations',
  );
  return list.bundles.map(toRecommendation);
};

/**
 * 추천 번들 상세: 적용될 순서대로의 사진(매번 최신 상태, 지워진 사진 제외). 「적용하기」도 이 응답을 씀
 * 삭제됐거나 없는 추천 번들은 RESOURCE_001(404)
 */
export const getRecommendation = async (bunchId: string, id: string, signal?: AbortSignal) => {
  const wireId = toWireId(id);
  // 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
  if (wireId === undefined) throw new ApiError({ category: 'validation', message: 'invalid id' });
  return toRecommendationDetail(
    await requestData(
      bffApi.get(`${listPath(bunchId)}/${wireId}`, { signal: signal ?? null }),
      recommendationDetailSchema,
      'recommendation',
    ),
  );
};

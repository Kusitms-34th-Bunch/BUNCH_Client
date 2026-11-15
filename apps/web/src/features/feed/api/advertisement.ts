import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { kokSchema } from '../model/kok';

/** 광고 장소 콕하기(명세 022). 이미 콕한 장소면 그 콕을 돌려줌. 취소는 번들 장소와 같은 콕 취소(명세 009) */
export const pinAd = (adId: number) =>
  requestData(bffApi.put(`feed/advertisements/${adId}/pin`), kokSchema, 'pin advertisement');

/** 광고 숨기기(명세 023, 사용자 단위). 숨긴 광고는 서버가 피드에서 뺌 */
export const hideAd = async (adId: number) => {
  await requestData(
    bffApi.put(`feed/advertisements/${adId}/hide`),
    z.null().optional(),
    'hide advertisement',
  );
};

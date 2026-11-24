import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { requireWireId } from '@/shared/api/client/ids';
import { kokSchema } from '../model/kok';

/** 광고 장소 콕하기(명세 022). 이미 콕한 장소면 그 콕을 돌려줌. 취소는 번들 장소와 같은 콕 취소(명세 009) */
export const pinAd = (adId: string) =>
  requestData(
    bffApi.put(`feed/advertisements/${requireWireId(adId, 'invalid advertisement')}/pin`),
    kokSchema,
    'pin advertisement',
  );

/** 광고 숨기기(명세 023, 사용자 단위). 숨긴 광고는 서버가 피드에서 뺌 */
export const hideAd = async (adId: string) => {
  await requestData(
    bffApi.put(`feed/advertisements/${requireWireId(adId, 'invalid advertisement')}/hide`),
    z.null().optional(),
    'hide advertisement',
  );
};

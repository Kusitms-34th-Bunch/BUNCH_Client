import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { bundleKoksSchema, kokSchema } from '../model/kok';

/** 번들 장소별 지금 번치의 콕 여부(명세 021, 다른 번들·광고에서 콕한 같은 장소도 콕한 것) */
export const getBundleKoks = (bundleId: number, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`bundles/${bundleId}/pinned-places`, { signal: signal ?? null }),
    bundleKoksSchema,
    'bundle koks',
  );

/** 장소 콕하기(명세 010). 이미 콕한 장소면 그 콕을 돌려줌 */
export const pinPlace = (bundleId: number, locationId: number) =>
  requestData(
    bffApi.put(`bundles/${bundleId}/locations/${locationId}/pin`),
    kokSchema,
    'pin place',
  );

/** 콕 취소(명세 009). 지금 번치 멤버 누구나, 다른 멤버가 콕한 것도 */
export const unpinPlace = async (pinId: number) => {
  await requestData(bffApi.delete(`pinned-places/${pinId}`), z.null().optional(), 'unpin place');
};

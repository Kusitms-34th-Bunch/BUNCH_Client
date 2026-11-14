import { bffApi, requestData } from '@/shared/api/bffApi';
import { likeResponseSchema } from '../model/like';

const likePath = (bundleId: number) => `bundles/${bundleId}/like`;

/** 지금 번치 명의로 좋아요를 켜거나 끔(명세 011·012). 같은 요청을 반복해도 결과가 같음 */
export const setBundleLike = (bundleId: number, liked: boolean) =>
  requestData(
    liked ? bffApi.put(likePath(bundleId)) : bffApi.delete(likePath(bundleId)),
    likeResponseSchema,
    liked ? 'like bundle' : 'unlike bundle',
  );

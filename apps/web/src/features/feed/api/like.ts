import { bffApi, requestData } from '@/shared/api/bffApi';
import { requireWireId } from '@/shared/api/ids';
import { likeResponseSchema } from '../model/like';

const likePath = (bundleId: string) => `bundles/${requireWireId(bundleId, 'invalid bundle')}/like`;

/** 지금 번치 명의로 좋아요를 켜거나 끔(명세 011·012). 같은 요청을 반복해도 결과가 같음 */
export const setBundleLike = (bundleId: string, liked: boolean) =>
  requestData(
    liked ? bffApi.put(likePath(bundleId)) : bffApi.delete(likePath(bundleId)),
    likeResponseSchema,
    liked ? 'like bundle' : 'unlike bundle',
  );

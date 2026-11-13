import { bffApi, requestData } from '@/shared/api/bffApi';
import { toWireId } from '@/shared/api/ids';
import { followCancellationSchema, followResultSchema } from '../model/otherBunch';

const followingPath = (viewerId: string, targetId: string) =>
  `bunches/${encodeURIComponent(viewerId)}/following/${encodeURIComponent(targetId)}`;

/** 내 번치(지금 번치)가 다른 번치를 팔로우. 공개 번치는 바로 팔로잉, 비공개는 요청 */
export const followBunch = (viewerId: string, targetId: string) =>
  requestData(bffApi.put(followingPath(viewerId, targetId)), followResultSchema, 'follow bunch');

/** 언팔로우·팔로우 요청 취소. `followId`는 번치 홈 응답(또는 팔로우 응답)의 관계 ID */
export const unfollowBunch = (viewerId: string, targetId: string, followId: string) => {
  const id = toWireId(followId);
  if (id === undefined) throw new Error('팔로우 ID가 올바르지 않습니다.');
  return requestData(
    bffApi.delete(followingPath(viewerId, targetId), { searchParams: { followId: id } }),
    followCancellationSchema,
    'unfollow bunch',
  );
};

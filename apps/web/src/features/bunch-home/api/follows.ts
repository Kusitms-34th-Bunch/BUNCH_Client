import { bffApi, requestData } from '@/shared/api/bffApi';
import { toWireId } from '@/shared/api/ids';
import {
  type FollowDecision,
  followDecisionResultSchema,
  followRequestPageSchema,
  relationPageSchema,
} from '../model/follows';
import { followCancellationSchema, followResultSchema } from '../model/otherBunch';

const bunchPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}`;
const followingPath = (viewerId: string, targetId: string) =>
  `${bunchPath(viewerId)}/following/${encodeURIComponent(targetId)}`;

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

// 목록은 한 번에 받을 수 있는 최대 쪽 크기만(더 불러오기는 UT 이후)
const LIST_PAGE_SIZE = 50;

/** 번치의 팔로워·팔로잉 첫 쪽. 비공개 번치는 팔로우 승인 전 403 */
export const getFollowRelations = (
  bunchId: string,
  kind: 'followers' | 'following',
  signal?: AbortSignal,
) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/${kind}`, {
      searchParams: { page: 0, size: LIST_PAGE_SIZE },
      signal: signal ?? null,
    }),
    relationPageSchema,
    `bunch ${kind}`,
  );

/** 내 번치에 온 대기 중인 팔로우 요청 첫 쪽 */
export const getFollowRequests = (viewerId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(viewerId)}/follow-requests`, {
      searchParams: { page: 0, size: LIST_PAGE_SIZE },
      signal: signal ?? null,
    }),
    followRequestPageSchema,
    'follow requests',
  );

/** 팔로우 요청 승인·거절 */
export const decideFollowRequest = (
  viewerId: string,
  requestId: string,
  decision: FollowDecision,
) =>
  requestData(
    bffApi.post(
      `${bunchPath(viewerId)}/follow-requests/${encodeURIComponent(requestId)}/decision`,
      { json: { decision } },
    ),
    followDecisionResultSchema,
    'follow request decision',
  );

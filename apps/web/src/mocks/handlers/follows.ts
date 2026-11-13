import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState, MockFollow } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { myMembershipsByRecent } from './members';

// 번치 팔로우(Swagger). 명세에 오류 코드가 없어 권한은 AUTH_002, 자기 번치 팔로우는 COMMON_001로 둠
// ponytail: 비공개 번치 요청 승인은 상대 번치 몫이라 이 가짜 서버에서는 승인되지 않음(팔로우 요청 목록 연결 때)

/** 지금 내 번치(마지막 사용 번치, `members/me`의 기본 번치). 번치 홈 응답의 팔로우 명의 */
export const viewerBunchId = (state: MockDbState) => myMembershipsByRecent(state)[0]?.bunchId;

export const followOf = (state: MockDbState, viewerId: number | undefined, targetId: number) =>
  viewerId === undefined
    ? undefined
    : state.follows.find(
        (follow) => follow.followerBunchId === viewerId && follow.targetBunchId === targetId,
      );

/** 시작 데이터 수에 가짜 DB의 팔로우(승인된 것만)를 더한 팔로워·팔로잉 수 */
export const followCounts = (state: MockDbState, bunchId: number) => {
  const bunch = state.bunches.find((item) => item.id === bunchId);
  const accepted = state.follows.filter((follow) => follow.status === 'FOLLOWING');
  return {
    followerCount:
      (bunch?.followerCount ?? 0) + accepted.filter((f) => f.targetBunchId === bunchId).length,
    followingCount:
      (bunch?.followingCount ?? 0) + accepted.filter((f) => f.followerBunchId === bunchId).length,
  };
};

/** 경로의 내 번치(팔로우 명의)와 상대 번치. 내가 속한 번치가 아니면 403 */
const pair = (params: Record<string, string | readonly string[] | undefined>) => {
  const viewerId = toWireId(params.viewerId);
  const targetId = toWireId(params.targetId);
  if (viewerId === undefined || targetId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  const target = state.bunches.find((bunch) => bunch.id === targetId);
  if (!target) return { error: fail(404, 'RESOURCE_001') };
  const mine = state.memberships.some(
    (item) => item.bunchId === viewerId && item.memberId === MOCK_MY_MEMBER_ID,
  );
  if (!mine) return { error: fail(403, 'AUTH_002') };
  if (viewerId === targetId) return { error: fail(400, 'COMMON_001') };
  return { viewerId, targetId, target, state };
};

export const followHandlers = [
  // PUT /api/v1/bunches/{viewerId}/following/{targetId}: 공개 번치는 바로 팔로우, 비공개는 요청. 이미 있으면 그 관계 그대로
  http.put('/api/bunches/:viewerId/following/:targetId', ({ params }) => {
    const found = pair(params);
    if ('error' in found) return found.error;
    const { viewerId, targetId, target, state } = found;
    const existing = followOf(state, viewerId, targetId);
    if (existing) return ok({ followState: existing.status, followId: existing.id });
    const follow: MockFollow = {
      id: Math.max(0, ...state.follows.map((item) => item.id)) + 1,
      followerBunchId: viewerId,
      targetBunchId: targetId,
      status: target.isPrivate ? 'REQUESTED' : 'FOLLOWING',
    };
    mockDb.update((current) => ({ ...current, follows: [...current.follows, follow] }));
    return ok({ followState: follow.status, followId: follow.id });
  }),

  // DELETE /api/v1/bunches/{viewerId}/following/{targetId}?followId=: 언팔로우·요청 취소. 다른 관계의 ID면 404
  http.delete('/api/bunches/:viewerId/following/:targetId', ({ params, request }) => {
    const found = pair(params);
    if ('error' in found) return found.error;
    const followId = toWireId(new URL(request.url).searchParams.get('followId') ?? undefined);
    if (followId === undefined) return fail(400, 'COMMON_001');
    const existing = followOf(found.state, found.viewerId, found.targetId);
    if (!existing || existing.id !== followId) return fail(404, 'RESOURCE_001');
    mockDb.update((current) => ({
      ...current,
      follows: current.follows.filter((item) => item !== existing),
    }));
    return ok({ followState: 'NONE', followId: existing.id, cancelled: existing.status });
  }),
];

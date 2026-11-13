import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState, MockFollow } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { myMembershipsByRecent } from './members';

// 번치 팔로우·관계 목록·요청 결정(Swagger). 명세에 오류 코드가 없어 권한은 AUTH_002, 자기 번치 팔로우는 COMMON_001로 둠
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

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

/** 두 번치 사이에 어느 쪽이든 차단이 있는지(차단하면 서로의 프로필·관계 목록을 볼 수 없음) */
export const isBlockedBetween = (state: MockDbState, a: number | undefined, b: number) =>
  a !== undefined &&
  state.blocks.some(
    (block) =>
      (block.blockerBunchId === a && block.targetBunchId === b) ||
      (block.blockerBunchId === b && block.targetBunchId === a),
  );

export const isMine = (state: MockDbState, bunchId: number) =>
  state.memberships.some((item) => item.bunchId === bunchId && item.memberId === MOCK_MY_MEMBER_ID);

/** 경로의 내 번치(팔로우 명의)와 상대 번치. 내가 속한 번치가 아니면 403 */
const pair = (params: Record<string, string | readonly string[] | undefined>) => {
  const viewerId = toWireId(params.viewerId);
  const targetId = toWireId(params.targetId);
  if (viewerId === undefined || targetId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  const target = state.bunches.find((bunch) => bunch.id === targetId);
  if (!target) return { error: fail(404, 'RESOURCE_001') };
  if (!isMine(state, viewerId)) return { error: fail(403, 'AUTH_002') };
  if (viewerId === targetId) return { error: fail(400, 'COMMON_001') };
  return { viewerId, targetId, target, state };
};

/** `?page=&size=`. 잘못된 값이면 undefined(400) */
export const pageOf = (request: Request) => {
  const url = new URL(request.url);
  const parse = (value: string | null, fallback: number) =>
    value === null ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;
  const page = parse(url.searchParams.get('page'), 0);
  const size = parse(url.searchParams.get('size'), DEFAULT_PAGE_SIZE);
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(size) || size < 1) return undefined;
  return { page, size: Math.min(size, MAX_PAGE_SIZE) };
};

export const paged = <T>(items: readonly T[], { page, size }: { page: number; size: number }) => ({
  items: items.slice(page * size, (page + 1) * size),
  page,
  size,
  totalElements: items.length,
  hasNext: (page + 1) * size < items.length,
});

export const cardOf = (state: MockDbState, bunchId: number) => {
  const bunch = state.bunches.find((item) => item.id === bunchId);
  return bunch
    ? {
        id: bunch.id,
        name: bunch.name,
        imageUrl: bunch.imageUrl ?? undefined,
        characterType: bunch.characterType,
        visibility: bunch.isPrivate ? 'PRIVATE' : 'PUBLIC',
      }
    : undefined;
};

/**
 * 팔로워·팔로잉 목록(승인된 관계, 최근순). 행의 followState는 지금 내 번치(명의)가 그 번치를 팔로우하는 상태
 * 다른 번치는 공개이거나 내 번치가 팔로우 승인됐을 때만 봄(번치 홈의 canViewRelations와 같음)
 */
const relationList = (kind: 'followers' | 'following') =>
  http.get(`/api/bunches/:targetId/${kind}`, ({ params, request }) => {
    const targetId = toWireId(params.targetId);
    const page = pageOf(request);
    if (targetId === undefined || !page) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const target = state.bunches.find((bunch) => bunch.id === targetId);
    if (!target) return fail(404, 'BUNCH_009');
    const viewer = viewerBunchId(state);
    const canView =
      isMine(state, targetId) ||
      !target.isPrivate ||
      followOf(state, viewer, targetId)?.status === 'FOLLOWING';
    if (!canView || isBlockedBetween(state, viewer, targetId)) return fail(403, 'AUTH_002');
    const relations = state.follows
      .filter(
        (follow) =>
          follow.status === 'FOLLOWING' &&
          (kind === 'followers' ? follow.targetBunchId : follow.followerBunchId) === targetId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    const items = relations.flatMap((follow) => {
      const bunchId = kind === 'followers' ? follow.followerBunchId : follow.targetBunchId;
      const bunch = cardOf(state, bunchId);
      const mine = bunchId === viewer ? undefined : followOf(state, viewer, bunchId);
      return bunch
        ? [
            {
              bunch,
              followState: mine?.status ?? 'NONE',
              followId: mine?.id,
              followedAt: follow.createdAt,
            },
          ]
        : [];
    });
    return ok(paged(items, page));
  });

export const followHandlers = [
  // GET /api/v1/bunches/{targetId}/followers·following?page=&size=
  relationList('followers'),
  relationList('following'),

  // GET /api/v1/bunches/{viewerId}/follow-requests?page=&size=: 내 번치에 온 대기 중인 요청(최근순)
  http.get('/api/bunches/:viewerId/follow-requests', ({ params, request }) => {
    const viewerId = toWireId(params.viewerId);
    const page = pageOf(request);
    if (viewerId === undefined || !page) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    if (!isMine(state, viewerId)) return fail(403, 'AUTH_002');
    const items = state.follows
      .filter((follow) => follow.targetBunchId === viewerId && follow.status === 'REQUESTED')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .flatMap((follow) => {
        const bunch = cardOf(state, follow.followerBunchId);
        return bunch ? [{ id: follow.id, bunch, requestedAt: follow.createdAt }] : [];
      });
    return ok(paged(items, page));
  }),

  // POST /api/v1/bunches/{viewerId}/follow-requests/{requestId}/decision { decision: APPROVE | REJECT }
  // 이미 승인된 요청은 applied: false·APPROVED, 취소·거절돼 없어진 요청은 applied: false·UNAVAILABLE
  http.post(
    '/api/bunches/:viewerId/follow-requests/:requestId/decision',
    async ({ params, request }) => {
      const viewerId = toWireId(params.viewerId);
      const requestId = toWireId(params.requestId);
      const body = (await request.json().catch(() => null)) as { decision?: unknown } | null;
      const decision = body?.decision;
      if (
        viewerId === undefined ||
        requestId === undefined ||
        (decision !== 'APPROVE' && decision !== 'REJECT')
      ) {
        return fail(400, 'COMMON_001');
      }
      const state = mockDb.get();
      if (!isMine(state, viewerId)) return fail(403, 'AUTH_002');
      const follow = state.follows.find(
        (item) => item.id === requestId && item.targetBunchId === viewerId,
      );
      if (!follow) return ok({ requestId, applied: false, state: 'UNAVAILABLE' });
      if (follow.status === 'FOLLOWING')
        return ok({ requestId, applied: false, state: 'APPROVED' });
      mockDb.update((current) => ({
        ...current,
        follows:
          decision === 'APPROVE'
            ? current.follows.map((item) =>
                item.id === requestId ? { ...item, status: 'FOLLOWING' as const } : item,
              )
            : current.follows.filter((item) => item.id !== requestId),
      }));
      return ok({
        requestId,
        applied: true,
        state: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      });
    },
  ),

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
      createdAt: new Date().toISOString(),
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

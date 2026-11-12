import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { MemberRole, MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { readJson } from './bundles';

// 멤버 관리(Swagger 기준). 가짜 서버는 소속 ID를 회원 ID로 대신함(번치 홈의 myMembership과 같음)
// 버전 충돌 코드는 Swagger에 없어 가짜 코드로 둠
type Body = {
  actorMembershipId?: number;
  expectedMembershipVersion?: number;
  role?: MemberRole;
  targetMembershipId?: number;
};

const versionOf = (state: MockDbState, bunchId: number) =>
  state.bunches.find((bunch) => bunch.id === bunchId)?.membershipVersion ?? 1;

/** 내가 상대에게 할 수 있는 관리 동작(Figma 권한 표: 공동 관리자는 메인 관리자 외 내보내기만) */
const actionsOf = (mine: MemberRole, target: MemberRole, isMe: boolean) => {
  const owner = mine === 'OWNER' && !isMe;
  return {
    canGrantCoOwner: owner && target === 'MEMBER',
    canRevokeCoOwner: owner && target === 'CO_OWNER',
    canTransferOwner: owner,
    canRemove: !isMe && (owner || (mine === 'CO_OWNER' && target !== 'OWNER')),
  };
};

/** 내 소속과 번치 버전. 내 번치가 아니면 오류 응답 */
const context = (rawBunchId: unknown) => {
  const bunchId = toWireId(rawBunchId as string | undefined);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  if (!state.bunches.some((bunch) => bunch.id === bunchId))
    return { error: fail(404, 'RESOURCE_001') };
  const mine = state.memberships.find(
    (item) => item.bunchId === bunchId && item.memberId === MOCK_MY_MEMBER_ID,
  );
  if (!mine) return { error: fail(403, 'AUTH_002') };
  return { bunchId, mine, state };
};

/** 바꾸는 요청 공통 검사: 요청자와 버전(비교와 갱신 사이에 await 없음) */
const check = (bunchId: number, body: Body) => {
  if (body.actorMembershipId !== MOCK_MY_MEMBER_ID) return fail(403, 'AUTH_002');
  if (body.expectedMembershipVersion !== versionOf(mockDb.get(), bunchId)) {
    return fail(409, 'MOCK_MEMBERSHIP_VERSION');
  }
  return null;
};

const commit = (bunchId: number, change: (_state: MockDbState) => MockDbState) => {
  mockDb.update((state) => {
    const next = change(state);
    return {
      ...next,
      bunches: next.bunches.map((bunch) =>
        bunch.id === bunchId
          ? { ...bunch, membershipVersion: versionOf(state, bunchId) + 1 }
          : bunch,
      ),
    };
  });
  return versionOf(mockDb.get(), bunchId);
};

const targetOf = (bunchId: number, rawId: unknown) => {
  // 경로 파라미터는 문자열, 넘기기 본문은 숫자라 문자열로 맞춘 뒤 변환
  const memberId = toWireId(
    typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : undefined,
  );
  return mockDb
    .get()
    .memberships.find((item) => item.bunchId === bunchId && item.memberId === memberId);
};

const mutationResult = (bunchId: number, version: number, changed: number[]) => ({
  bunchId,
  membershipVersion: version,
  changedMembershipIds: changed,
  ownerMembershipId:
    mockDb.get().memberships.find((item) => item.bunchId === bunchId && item.role === 'OWNER')
      ?.memberId ?? 0,
});

export const membershipHandlers = [
  // GET /api/v1/bunches/{bunchId}/memberships
  http.get('/api/bunches/:bunchId/memberships', ({ params }) => {
    const found = context(params.bunchId);
    if ('error' in found) return found.error;
    const { bunchId, mine, state } = found;
    return ok({
      bunchId,
      membershipVersion: versionOf(state, bunchId),
      myMembership: {
        membershipId: mine.memberId,
        role: mine.role,
        joinedAt: '2026-08-01T00:00:00.000Z',
      },
      members: state.memberships
        .filter((item) => item.bunchId === bunchId)
        .map((item) => {
          const member = state.members.find((m) => m.memberId === item.memberId);
          const isMe = item.memberId === MOCK_MY_MEMBER_ID;
          return {
            membershipId: item.memberId,
            memberId: item.memberId,
            nickname: member?.nickname ?? '',
            imageUrl: member?.imageUrl ?? null,
            role: item.role,
            isMe,
            joinedAt: '2026-08-01T00:00:00.000Z',
            actions: actionsOf(mine.role, item.role, isMe),
          };
        }),
    });
  }),

  // PUT /api/v1/bunches/{bunchId}/memberships/{membershipId}/role: 공동 관리자 지정·해제(메인 관리자만)
  http.put('/api/bunches/:bunchId/memberships/:membershipId/role', async ({ params, request }) => {
    const found = context(params.bunchId);
    if ('error' in found) return found.error;
    const body = ((await readJson(request)) ?? {}) as Body;
    const target = targetOf(found.bunchId, params.membershipId);
    if (!target) return fail(404, 'RESOURCE_001');
    const rejected = check(found.bunchId, body);
    if (rejected) return rejected;
    const allowed = actionsOf(found.mine.role, target.role, target.memberId === MOCK_MY_MEMBER_ID);
    const permitted =
      (body.role === 'CO_OWNER' && allowed.canGrantCoOwner) ||
      (body.role === 'MEMBER' && allowed.canRevokeCoOwner);
    if (!permitted) return fail(403, 'AUTH_002');
    const version = commit(found.bunchId, (state) => ({
      ...state,
      memberships: state.memberships.map((item) =>
        item === target ? { ...item, role: body.role as MemberRole } : item,
      ),
    }));
    return ok(mutationResult(found.bunchId, version, [target.memberId]));
  }),

  // POST /api/v1/bunches/{bunchId}/memberships/{membershipId}/remove: 내보내기
  http.post(
    '/api/bunches/:bunchId/memberships/:membershipId/remove',
    async ({ params, request }) => {
      const found = context(params.bunchId);
      if ('error' in found) return found.error;
      const body = ((await readJson(request)) ?? {}) as Body;
      const target = targetOf(found.bunchId, params.membershipId);
      if (!target) return fail(404, 'RESOURCE_001');
      const rejected = check(found.bunchId, body);
      if (rejected) return rejected;
      if (
        !actionsOf(found.mine.role, target.role, target.memberId === MOCK_MY_MEMBER_ID).canRemove
      ) {
        return fail(403, 'AUTH_002');
      }
      const version = commit(found.bunchId, (state) => ({
        ...state,
        memberships: state.memberships.filter((item) => item !== target),
      }));
      const memberCount = mockDb
        .get()
        .memberships.filter((m) => m.bunchId === found.bunchId).length;
      return ok({
        bunchId: found.bunchId,
        removedMembershipId: target.memberId,
        membershipVersion: version,
        memberCount,
      });
    },
  ),

  // POST /api/v1/bunches/{bunchId}/owner-transfer: 메인 관리자 넘기기(나는 일반 멤버), 멱등 키 필수
  http.post('/api/bunches/:bunchId/owner-transfer', async ({ params, request }) => {
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    if (!key) return fail(400, 'COMMON_001');
    const found = context(params.bunchId);
    if ('error' in found) return found.error;
    const body = ((await readJson(request)) ?? {}) as Body;
    // 같은 키·본문의 재전송(첫 응답 유실)은 버전 검사 전에 처음 응답을 돌려줌
    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:owner-transfer:${found.bunchId}`,
      key,
      JSON.stringify(body),
      () => {
        const target = targetOf(found.bunchId, body.targetMembershipId);
        if (!target) return { status: 404, body: { code: 'RESOURCE_001' } };
        if (body.actorMembershipId !== MOCK_MY_MEMBER_ID)
          return { status: 403, body: { code: 'AUTH_002' } };
        if (body.expectedMembershipVersion !== versionOf(mockDb.get(), found.bunchId)) {
          return { status: 409, body: { code: 'MOCK_MEMBERSHIP_VERSION' } };
        }
        const mine = mockDb
          .get()
          .memberships.find((m) => m.bunchId === found.bunchId && m.memberId === MOCK_MY_MEMBER_ID);
        if (
          !mine ||
          !actionsOf(mine.role, target.role, target.memberId === MOCK_MY_MEMBER_ID).canTransferOwner
        ) {
          return { status: 403, body: { code: 'AUTH_002' } };
        }
        const version = commit(found.bunchId, (state) => ({
          ...state,
          memberships: state.memberships.map((item) =>
            item === target
              ? { ...item, role: 'OWNER' }
              : item.bunchId === found.bunchId && item.memberId === MOCK_MY_MEMBER_ID
                ? { ...item, role: 'MEMBER' }
                : item,
          ),
        }));
        return {
          status: 200,
          body: mutationResult(found.bunchId, version, [target.memberId, MOCK_MY_MEMBER_ID]),
        };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    return stored.status === 200
      ? ok(stored.body as ReturnType<typeof mutationResult>)
      : fail(stored.status, (stored.body as { code: string }).code);
  }),
];

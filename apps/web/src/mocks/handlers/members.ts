import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';

// 소속 번치 최대 개수(기능명세 5.2.4, 번치 만들기의 BUNCH_003과 같은 값)
const MAX_ACTIVE_BUNCHES = 10;

/** 내 소속을 최근 사용순으로. 첫 번째가 기본 번치(마지막 사용 번치) */
const myMembershipsByRecent = (state: MockDbState) =>
  state.memberships
    .filter((membership) => membership.memberId === MOCK_MY_MEMBER_ID)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt));

// BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로(docs/architecture/api-boundary.md)
export const memberHandlers = [
  // GET /api/v1/members/me
  http.get('/api/members/me', () => {
    const state = mockDb.get();
    const me = state.members.find((item) => item.memberId === MOCK_MY_MEMBER_ID);
    if (!me) return fail(401, 'AUTH_001');
    const latest = myMembershipsByRecent(state)[0];
    const defaultBunch = state.bunches.find((bunch) => bunch.id === latest?.bunchId);
    return ok({
      memberId: me.memberId,
      nickname: me.nickname,
      imageUrl: me.imageUrl,
      birthYear: me.birthYear,
      gender: me.gender,
      defaultBunch: defaultBunch
        ? {
            id: defaultBunch.id,
            name: defaultBunch.name,
            characterType: defaultBunch.characterType,
            imageUrl: defaultBunch.imageUrl,
          }
        : null,
    });
  }),

  // GET /api/v1/members/me/bunches: 소속 번치(최근 사용순)와 접근 불가 번치 안내. 안 읽은 알림은 알림 API 전이라 0
  http.get('/api/members/me/bunches', () => {
    const state = mockDb.get();
    const mine = myMembershipsByRecent(state);
    return ok({
      activeCount: mine.length,
      maxActiveCount: MAX_ACTIVE_BUNCHES,
      defaultBunchId: mine[0]?.bunchId ?? null,
      activeBunches: mine.flatMap((membership) => {
        const bunch = state.bunches.find((item) => item.id === membership.bunchId);
        if (!bunch) return [];
        return [
          {
            bunch: {
              id: bunch.id,
              name: bunch.name,
              imageUrl: bunch.imageUrl,
              characterType: bunch.characterType,
              visibility: bunch.isPrivate ? 'PRIVATE' : 'PUBLIC',
            },
            // ponytail: 소속 ID·참여 시각은 회원 ID와 고정 시각(번치 홈 handler와 같은 규칙)
            myMembership: {
              membershipId: membership.memberId,
              role: membership.role,
              joinedAt: '2026-09-01T00:00:00.000Z',
            },
            unreadCount: 0,
            lastUsedAt: membership.lastUsedAt,
          },
        ];
      }),
      // ponytail: 30일 뒤 만료(expiresAt)는 시각만 내려주고 목록에서 자동으로 빼지 않음
      unavailableBunches: state.bunchAccessNotices.map((notice) => ({
        ...notice,
        expiresAt: new Date(Date.parse(notice.occurredAt) + 30 * 86_400_000).toISOString(),
      })),
    });
  }),

  // DELETE /api/v1/members/me/bunch-access-notices/{noticeId}: 전환 목록의 「번치 목록에서 삭제」
  http.delete('/api/members/me/bunch-access-notices/:noticeId', ({ params }) => {
    const noticeId = toWireId(params.noticeId);
    if (noticeId === undefined) return fail(400, 'COMMON_001');
    if (!mockDb.get().bunchAccessNotices.some((notice) => notice.id === noticeId)) {
      return fail(404, 'RESOURCE_001');
    }
    mockDb.update((state) => ({
      ...state,
      bunchAccessNotices: state.bunchAccessNotices.filter((notice) => notice.id !== noticeId),
    }));
    return ok(null);
  }),

  // PUT /api/v1/bunches/{id}/last-used: 번치 전환. 내 소속 번치만(아니면 AUTH_002), 기본 번치가 이 번치로 바뀜
  http.put('/api/bunches/:id/last-used', ({ params }) => {
    const bunchId = toWireId(params.id);
    if (bunchId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    if (!state.bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const isMine = (membership: MockDbState['memberships'][number]) =>
      membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID;
    if (!state.memberships.some(isMine)) return fail(403, 'AUTH_002');
    const now = new Date().toISOString();
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.map((membership) =>
        isMine(membership) ? { ...membership, lastUsedAt: now } : membership,
      ),
    }));
    return ok(null);
  }),

  // GET /api/v1/members/nickname-availability: 가짜 서버는 「중복」이 들어간 닉네임만 사용 중으로 취급(시연용)
  http.get('/api/members/nickname-availability', ({ request }) => {
    const nickname = new URL(request.url).searchParams.get('nickname')?.trim() ?? '';
    if (nickname === '') return fail(400, 'COMMON_001');
    return ok({ normalizedValue: nickname, available: !nickname.includes('중복') });
  }),

  // POST /api/v1/members/me/registration: multipart 본문은 읽지 않고 가입 완료만 돌려줌(가짜 서버는 이미 가입을 마친 상태)
  http.post('/api/members/me/registration', () =>
    ok({
      memberId: MOCK_MY_MEMBER_ID,
      signupStatus: 'COMPLETED',
      nickname: '큐시즘',
      imageUrl: null,
    }),
  ),

  // GET /api/v1/members/me/onboarding: 가짜 서버는 가입을 마친 시연 사용자를 가정(가입 중 시나리오는 server.use로 덮어씀)
  http.get('/api/members/me/onboarding', () => {
    const membership = myMembershipsByRecent(mockDb.get())[0];
    return ok({
      memberId: MOCK_MY_MEMBER_ID,
      signupStatus: 'COMPLETED',
      termsAccepted: true,
      ...(membership ? { defaultBunchId: membership.bunchId } : {}),
    });
  }),

  // GET /api/v1/bunches/{bunchId}/members
  http.get('/api/bunches/:bunchId/members', ({ params }) => {
    const bunchId = toWireId(params.bunchId);
    if (bunchId === undefined) return fail(400, 'COMMON_001');
    const { members, memberships, bunches } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const bunchMemberships = memberships.filter((membership) => membership.bunchId === bunchId);
    if (!bunchMemberships.some((membership) => membership.memberId === MOCK_MY_MEMBER_ID)) {
      return fail(403, 'AUTH_002');
    }
    return ok(
      bunchMemberships.flatMap((membership) => {
        const member = members.find((item) => item.memberId === membership.memberId);
        return member
          ? [
              {
                memberId: member.memberId,
                nickname: member.nickname,
                imageUrl: member.imageUrl,
                role: membership.role,
              },
            ]
          : [];
      }),
    );
  }),
];

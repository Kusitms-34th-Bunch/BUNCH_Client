import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockBunchAccessNotice, MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { versionOf } from './memberships';
import { unreadCountOf } from './notifications';

// 가짜 서버가 새 프로필 사진으로 쓰는 시연 이미지(올린 사진 내용은 읽지 않음)
const MOCK_UPLOADED_PROFILE_IMAGE = '/mock/photos/C2.jpg';

// ponytail: 30일 뒤 만료(expiresAt)는 시각만 내려주고 목록·조회에서 자동으로 빼지 않음
const noticeResponse = (notice: MockBunchAccessNotice) => ({
  ...notice,
  expiresAt: new Date(Date.parse(notice.occurredAt) + 30 * 86_400_000).toISOString(),
});

/** 내가 소속되지 않은 번치의 안내(보던 번치가 삭제·내보내짐). 다시 들어간 번치면 안내를 무시(명세 068·074) */
export const accessNoticeFor = (state: MockDbState, bunchId: number | undefined) =>
  bunchId === undefined ||
  state.memberships.some(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  )
    ? undefined
    : state.bunchAccessNotices.find((notice) => notice.bunchId === bunchId);

/** 내가 메인 관리자인 번치 */
const myOwnedBunches = (state: MockDbState) =>
  state.memberships.flatMap((membership) => {
    if (membership.memberId !== MOCK_MY_MEMBER_ID || membership.role !== 'OWNER') return [];
    const bunch = state.bunches.find((item) => item.id === membership.bunchId);
    return bunch ? [bunch] : [];
  });

// 소속 번치 최대 개수(기능명세 5.2.4, 번치 만들기의 BUNCH_003과 같은 값)
const MAX_ACTIVE_BUNCHES = 10;

/** 내 소속을 최근 사용순으로. 첫 번째가 기본 번치(마지막 사용 번치) */
export const myMembershipsByRecent = (state: MockDbState) =>
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
            unreadCount: unreadCountOf(state, bunch.id),
            lastUsedAt: membership.lastUsedAt,
          },
        ];
      }),
      unavailableBunches: state.bunchAccessNotices.map(noticeResponse),
    });
  }),

  // GET /api/v1/members/me/bunch-access-notices/{noticeId}: 안내 한 건(명세 078). 확인한(지운) 안내는 RESOURCE_001
  http.get('/api/members/me/bunch-access-notices/:noticeId', ({ params }) => {
    const noticeId = toWireId(params.noticeId);
    if (noticeId === undefined) return fail(400, 'COMMON_001');
    const notice = mockDb.get().bunchAccessNotices.find((item) => item.id === noticeId);
    return notice ? ok(noticeResponse(notice)) : fail(404, 'RESOURCE_001');
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

  // POST /api/v1/members/me/registration: multipart 본문은 읽지 않고 가입 완료만 기록(닉네임은 시작 데이터 그대로)
  http.post('/api/members/me/registration', () => {
    mockDb.update((state) => ({
      ...state,
      session: { ...state.session, signupStatus: 'COMPLETED' },
    }));
    return ok({
      memberId: MOCK_MY_MEMBER_ID,
      signupStatus: 'COMPLETED',
      nickname: '큐시즘',
      imageUrl: null,
    });
  }),

  // PUT /api/v1/members/me/profile: multipart `profile`(닉네임·imageAction)·`photo`(REPLACE일 때)
  // 닉네임 중복은 중복 확인과 같이 「중복」이 들어간 닉네임만, 코드는 가입과 같은 USER_002로 둠(Swagger에 오류 코드 없음)
  http.put('/api/members/me/profile', async ({ request }) => {
    const form = await request.formData().catch(() => null);
    const part = form?.get('profile');
    const profile = await (async () => {
      try {
        return part instanceof Blob
          ? (JSON.parse(await part.text()) as { nickname?: string; imageAction?: string })
          : null;
      } catch {
        return null;
      }
    })();
    const nickname = profile?.nickname?.trim() ?? '';
    const action = profile?.imageAction;
    if (!profile || nickname.length < 1 || nickname.length > 12) return fail(400, 'COMMON_001');
    if (action !== 'KEEP' && action !== 'REPLACE' && action !== 'RESET') {
      return fail(400, 'COMMON_001');
    }
    if (action === 'REPLACE' && !(form?.get('photo') instanceof Blob))
      return fail(400, 'COMMON_001');
    if (nickname.includes('중복')) return fail(409, 'USER_002');
    mockDb.update((state) => ({
      ...state,
      members: state.members.map((member) =>
        member.memberId === MOCK_MY_MEMBER_ID
          ? {
              ...member,
              nickname,
              imageUrl:
                action === 'REPLACE'
                  ? MOCK_UPLOADED_PROFILE_IMAGE
                  : action === 'RESET'
                    ? null
                    : member.imageUrl,
            }
          : member,
      ),
    }));
    const me = mockDb.get().members.find((member) => member.memberId === MOCK_MY_MEMBER_ID);
    return me
      ? ok({ memberId: me.memberId, nickname: me.nickname, imageUrl: me.imageUrl })
      : fail(401, 'AUTH_001');
  }),

  // GET /api/v1/members/me/withdrawal/check: 내가 메인 관리자인 번치(혼자 있는 번치 포함, 넘길 멤버는 화면이 멤버 목록으로 확인)
  http.get('/api/members/me/withdrawal/check', () => {
    const state = mockDb.get();
    return ok({
      ownerBunches: myOwnedBunches(state).map((bunch) => ({
        bunchId: bunch.id,
        name: bunch.name,
        imageUrl: bunch.imageUrl,
        // 가짜 서버는 소속 ID를 회원 ID로 대신함(멤버 관리 handler와 같음)
        myMembershipId: MOCK_MY_MEMBER_ID,
        membershipVersion: versionOf(state, bunch.id),
      })),
    });
  }),

  // POST /api/v1/members/me/withdrawal: 다른 멤버가 있는 번치의 메인 관리자면 거절(코드는 Swagger에 없어 가짜 코드)
  // ponytail: 시연 데이터를 지우지 않고 성공만 돌려줌(이어서 화면이 부르는 로그아웃이 세션을 끝냄)
  http.post('/api/members/me/withdrawal', () => {
    const state = mockDb.get();
    const blocked = myOwnedBunches(state).some((bunch) =>
      state.memberships.some(
        (membership) =>
          membership.bunchId === bunch.id && membership.memberId !== MOCK_MY_MEMBER_ID,
      ),
    );
    return blocked ? fail(409, 'MOCK_WITHDRAWAL_OWNER') : ok(null);
  }),

  // GET /api/v1/members/me/onboarding: 가짜 DB의 세션(시작값은 `createSeedFor`). 로그아웃했으면 401
  http.get('/api/members/me/onboarding', () => {
    const state = mockDb.get();
    const { loggedIn, signupStatus, termsAccepted } = state.session;
    if (!loggedIn) return fail(401, 'AUTH_001');
    const membership = myMembershipsByRecent(state)[0];
    return ok({
      memberId: MOCK_MY_MEMBER_ID,
      signupStatus,
      termsAccepted,
      ...(membership ? { defaultBunchId: membership.bunchId } : {}),
    });
  }),
];

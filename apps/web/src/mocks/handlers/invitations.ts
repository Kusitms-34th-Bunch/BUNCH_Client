import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import type { CharacterType, MockBunch } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { readJson } from './bundles';

// 백엔드 명세(초대 확인·초대 참여) 기준: 판단 순서는 초대 무효 → 이미 소속 → 정원 8명 → 내 소속 10개
const MAX_BUNCH_MEMBERS = 8;
const MAX_ACTIVE_BUNCHES = 10;

/** 가짜 서버 시연용 초대: 아직 DB에 없는 번치로 참여할 수 있는 초대(참여하면 번치가 DB에 생김) */
const DEMO_INVITATIONS: Readonly<
  Record<
    string,
    { name: string; introduction: string; characterType: CharacterType; inviter: string }
  >
> = {
  MOCKJOIN: {
    name: '여행가조',
    introduction: '틈만 나면 떠나는 여행 좋아하는 네 명',
    characterType: 'TYPE_3',
    inviter: '민지',
  },
};

/** 전체 초대 URL·토큰·보조 코드를 서버처럼 trim·대문자 코드로 맞춤(URL은 마지막 경로 조각) */
const toCode = (invitation: string) => {
  const value = invitation.trim();
  try {
    const url = new URL(value);
    return (url.pathname.split('/').filter(Boolean).at(-1) ?? '').toUpperCase();
  } catch {
    return value.toUpperCase();
  }
};

type DemoInvitation = (typeof DEMO_INVITATIONS)[string];
type Resolved =
  | { kind: 'invalid' }
  | { kind: 'bunch'; bunch: MockBunch }
  | { kind: 'demo'; demo: DemoInvitation };

/** 초대 코드가 가리키는 번치: 초대 발급 핸들러가 준 MOCK+번치 id 4자리 코드 또는 시연용 초대 */
const resolve = (code: string): Resolved => {
  const issued = /^MOCK(\d{4})$/.exec(code);
  if (issued) {
    const bunch = mockDb.get().bunches.find((item) => item.id === Number(issued[1]));
    return bunch ? { kind: 'bunch', bunch } : { kind: 'invalid' };
  }
  const demo = DEMO_INVITATIONS[code];
  if (!demo) return { kind: 'invalid' };
  // 이미 참여해 DB에 생긴 시연 번치는 그 번치로 취급
  const existing = mockDb.get().bunches.find((item) => item.name === demo.name);
  return existing ? { kind: 'bunch', bunch: existing } : { kind: 'demo', demo };
};

const inviterOf = (bunchId: number) => {
  const { memberships, members } = mockDb.get();
  const owner = memberships.find((item) => item.bunchId === bunchId && item.role === 'OWNER');
  return members.find((item) => item.memberId === owner?.memberId)?.nickname ?? null;
};

const cardOf = (resolved: Exclude<Resolved, { kind: 'invalid' }>, code: string) =>
  resolved.kind === 'bunch'
    ? {
        name: resolved.bunch.name,
        introduction: resolved.bunch.introduction,
        imageUrl: resolved.bunch.imageUrl,
        inviterNickname: inviterOf(resolved.bunch.id),
        code,
      }
    : {
        name: resolved.demo.name,
        introduction: resolved.demo.introduction,
        imageUrl: null,
        inviterNickname: resolved.demo.inviter,
        code,
      };

const eligibilityOf = (resolved: Exclude<Resolved, { kind: 'invalid' }>) => {
  const { memberships } = mockDb.get();
  if (resolved.kind === 'bunch') {
    const bunchMemberships = memberships.filter((item) => item.bunchId === resolved.bunch.id);
    if (bunchMemberships.some((item) => item.memberId === MOCK_MY_MEMBER_ID)) {
      return 'ALREADY_MEMBER' as const;
    }
    if (bunchMemberships.length >= MAX_BUNCH_MEMBERS) return 'FULL' as const;
  }
  const mine = memberships.filter((item) => item.memberId === MOCK_MY_MEMBER_ID).length;
  return mine >= MAX_ACTIVE_BUNCHES ? ('LIMIT_EXCEEDED' as const) : ('AVAILABLE' as const);
};

const bunchBody = (bunch: MockBunch) => ({
  id: bunch.id,
  name: bunch.name,
  characterType: bunch.characterType,
  imageUrl: bunch.imageUrl,
});

/** 참여: 시연용 초대면 번치를 DB에 만들고 본인을 MEMBER로 등록 */
const addMembership = (resolved: Exclude<Resolved, { kind: 'invalid' }>): number => {
  if (resolved.kind === 'bunch') {
    mockDb.update((state) => ({
      ...state,
      memberships: [
        ...state.memberships,
        { bunchId: resolved.bunch.id, memberId: MOCK_MY_MEMBER_ID, role: 'MEMBER' },
      ],
    }));
    return resolved.bunch.id;
  }
  const { demo } = resolved;
  const id = Math.max(0, ...mockDb.get().bunches.map((bunch) => bunch.id)) + 1;
  mockDb.update((state) => ({
    ...state,
    bunches: [
      ...state.bunches,
      {
        id,
        name: demo.name,
        characterType: demo.characterType,
        imageUrl: null,
        introduction: demo.introduction,
        isPrivate: false,
        followerCount: 0,
        followingCount: 0,
      },
    ],
    memberships: [
      ...state.memberships,
      { bunchId: id, memberId: MOCK_MY_MEMBER_ID, role: 'MEMBER' },
    ],
  }));
  return id;
};

export const invitationHandlers = [
  // GET /api/v1/invitations/{token}: 공개 초대 카드(로그인 불필요). 없거나 만료·폐기된 링크는 404 INVITE_001(구분하지 않음)
  http.get('/api/invitations/:token', ({ params }) => {
    const code = toCode(String(params.token));
    const resolved = resolve(code);
    if (resolved.kind === 'invalid') return fail(404, 'INVITE_001');
    return ok(cardOf(resolved, code));
  }),

  // POST /api/v1/invitations/verify: 참여하지 않고 카드와 참여 가능 여부만(소속이 10개여도 카드는 확인 가능)
  http.post('/api/invitations/verify', async ({ request }) => {
    const body = await readJson(request);
    if (typeof body?.invitation !== 'string' || body.invitation.trim() === '') {
      return fail(400, 'COMMON_001');
    }
    const code = toCode(body.invitation);
    const resolved = resolve(code);
    if (resolved.kind === 'invalid') return fail(404, 'INVITE_001');
    return ok({ card: cardOf(resolved, code), eligibility: eligibilityOf(resolved) });
  }),

  // POST /api/v1/invitations/join: 같은 멱등 키·초대의 재전송은 처음 결과, 이미 소속이면 ALREADY_MEMBER(200)
  http.post('/api/invitations/join', async ({ request }) => {
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    if (!key || typeof body?.invitation !== 'string' || body.invitation.trim() === '') {
      return fail(400, 'COMMON_001');
    }
    const code = toCode(body.invitation);
    const outcome = runIdempotent(`${MOCK_MY_MEMBER_ID}:invitation-join`, key, code, () => {
      const resolved = resolve(code);
      if (resolved.kind === 'invalid') return { status: 404, body: { code: 'INVITE_001' } };
      const eligibility = eligibilityOf(resolved);
      if (eligibility === 'ALREADY_MEMBER' && resolved.kind === 'bunch') {
        return { status: 200, body: { outcome: 'ALREADY_MEMBER', bunchId: resolved.bunch.id } };
      }
      if (eligibility === 'FULL') return { status: 409, body: { code: 'BUNCH_002' } };
      if (eligibility === 'LIMIT_EXCEEDED') return { status: 409, body: { code: 'BUNCH_003' } };
      return { status: 200, body: { outcome: 'JOINED', bunchId: addMembership(resolved) } };
    });
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) return fail(stored.status, (stored.body as { code: string }).code);
    const { outcome: result, bunchId } = stored.body as { outcome: string; bunchId: number };
    const bunch = mockDb.get().bunches.find((item) => item.id === bunchId);
    return bunch ? ok({ outcome: result, bunch: bunchBody(bunch) }) : fail(404, 'INVITE_001');
  }),
];

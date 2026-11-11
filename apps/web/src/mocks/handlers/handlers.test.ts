import { unwrapEnvelope } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { createBrowserApi } from '@/shared/api/browserClient';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail } from '../lib/envelope';
import { server } from '../server';

// 화면과 같은 browser client로 BFF 경로(`/api/…`)를 호출해 handler 경로 규칙까지 확인
const api = () => createBrowserApi({ baseUrl: new URL('/api/', location.origin).href });

type MyProfile = { memberId: number; nickname: string; defaultBunch: { id: number } | null };
type BunchMember = { memberId: number; nickname: string; role: string };

describe('가짜 서버 세션', () => {
  it('로그인 없이 항상 로그인된 세션을 돌려준다', async () => {
    expect(await api().get('session').json()).toEqual({ authenticated: true });
  });

  it('재발급과 로그아웃은 본문 없이 성공한다', async () => {
    // ky afterResponse hook이 본문 없는 204 응답을 복제하면 happy-dom 스트림 오류 발생(실제 브라우저는 무관), fetch로 확인
    for (const path of ['/api/auth/reissue', '/api/auth/logout']) {
      const response = await fetch(path, { method: 'POST' });
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
    }
  });
});

describe('가짜 서버 내 프로필', () => {
  it('시연하는 사람(일반 멤버)과 기본 번치를 돌려준다', async () => {
    const me = unwrapEnvelope<MyProfile>(await api().get('members/me').json());
    expect(me).toMatchObject({ memberId: MOCK_MY_MEMBER_ID, nickname: '큐시즘' });
    expect(me.defaultBunch?.id).toBe(MOCK_BUNCH_ID);
  });
});

describe('가짜 서버 가입 상태', () => {
  it('가입을 마친 시연 사람과 기본 번치를 돌려준다', async () => {
    const onboarding = unwrapEnvelope<{
      memberId: number;
      signupStatus: string;
      termsAccepted: boolean;
      defaultBunchId?: number;
    }>(await api().get('members/me/onboarding').json());
    expect(onboarding).toEqual({
      memberId: MOCK_MY_MEMBER_ID,
      signupStatus: 'COMPLETED',
      termsAccepted: true,
      defaultBunchId: MOCK_BUNCH_ID,
    });
  });
});

describe('가짜 서버 번치 멤버 목록', () => {
  it('번치의 활성 멤버와 역할을 돌려준다', async () => {
    const members = unwrapEnvelope<BunchMember[]>(
      await api().get(`bunches/${MOCK_BUNCH_ID}/members`).json(),
    );
    expect(members).toHaveLength(5);
    expect(members[0]).toMatchObject({ memberId: MOCK_MEMBER_IDS.admin, role: 'OWNER' });
    expect(members.find((member) => member.memberId === MOCK_MY_MEMBER_ID)?.role).toBe('MEMBER');
    expect(members.filter((member) => member.role === 'OWNER')).toHaveLength(1);
  });

  it('숫자가 아닌 번치 ID는 COMMON_001(400)이다', async () => {
    const response = await fetch('/api/bunches/abc/members');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'COMMON_001' } });
  });

  it('없는 번치는 RESOURCE_001(404)이다', async () => {
    const response = await fetch('/api/bunches/999/members');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'RESOURCE_001' } });
  });

  it('내가 소속이 아니면 AUTH_002(403)이다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (membership) => membership.memberId !== MOCK_MY_MEMBER_ID,
      ),
    }));
    const response = await fetch(`/api/bunches/${MOCK_BUNCH_ID}/members`);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_002' } });
  });
});

describe('테스트에서 handler 바꾸기', () => {
  it('server.use로 한 요청만 오류 응답으로 바꿀 수 있다', async () => {
    server.use(http.get('/api/members/me', () => fail(401, 'AUTH_001')));
    const response = await fetch('/api/members/me');
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_001' } });
  });
});

describe('가짜 서버 번치 만들기', () => {
  const create = (key: string | null, body: Record<string, unknown>) =>
    api().post('bunches', {
      json: body,
      throwHttpErrors: false,
      ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
    });
  const input = {
    name: '새번치',
    introduction: '소개',
    visibility: 'PUBLIC',
    characterType: 'TYPE_2',
  };

  it('번치를 만들고 만든 회원을 OWNER로 등록하며 같은 멱등 키는 같은 번치를 돌려준다', async () => {
    const first = unwrapEnvelope<{ id: number }>(await (await create('k-1', input)).json());
    const again = unwrapEnvelope<{ id: number }>(await (await create('k-1', input)).json());

    expect(again.id).toBe(first.id);
    const { memberships, bunches } = mockDb.get();
    expect(bunches.filter((bunch) => bunch.name === '새번치')).toHaveLength(1);
    expect(memberships).toContainEqual({
      bunchId: first.id,
      memberId: MOCK_MY_MEMBER_ID,
      role: 'OWNER',
    });
  });

  it('멱등 키가 없으면 400, 같은 키에 다른 입력은 409 REQUEST_001이다', async () => {
    expect((await create(null, input)).status).toBe(400);
    await create('k-2', input);
    const conflict = await create('k-2', { ...input, name: '다른번치' });
    expect(conflict.status).toBe(409);
  });

  it('이미 있는 이름은 BUNCH_001이고 이름 확인에도 사용 중으로 나온다', async () => {
    const taken = mockDb.get().bunches[0]!.name;
    const response = await create('k-3', { ...input, name: taken });
    expect(response.status).toBe(409);
    const body: { error: { code: string } } = await response.json();
    expect(body.error.code).toBe('BUNCH_001');

    const availability = unwrapEnvelope<{ available: boolean }>(
      await api()
        .get('bunches/name-availability', { searchParams: { name: taken } })
        .json(),
    );
    expect(availability.available).toBe(false);
  });

  it('없는 번치의 대표 사진은 바꿀 수 없다', async () => {
    const response = await api().put('bunches/999/profile-image', {
      body: new FormData(),
      throwHttpErrors: false,
    });
    expect(response.status).toBe(404);
  });
});

describe('가짜 서버 초대 확인·참여', () => {
  const verify = (invitation: string) =>
    api().post('invitations/verify', { json: { invitation }, throwHttpErrors: false });
  const join = (invitation: string, key: string | null) =>
    api().post('invitations/join', {
      json: { invitation },
      throwHttpErrors: false,
      ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
    });

  it('시연용 초대는 링크 URL이든 코드든 카드와 AVAILABLE을 돌려준다', async () => {
    for (const invitation of ['mockjoin', 'https://bunch.app/invite/MOCKJOIN']) {
      const response = await verify(invitation);
      const body = unwrapEnvelope<{ card: { name: string }; eligibility: string }>(
        await response.json(),
      );
      expect(body.card.name).toBe('여행가조');
      expect(body.eligibility).toBe('AVAILABLE');
    }
  });

  it('없는 초대는 404 INVITE_001이고 이미 속한 번치의 초대는 ALREADY_MEMBER다', async () => {
    expect((await verify('NOPE0000')).status).toBe(404);
    const body = unwrapEnvelope<{ eligibility: string }>(await (await verify('MOCK0001')).json());
    expect(body.eligibility).toBe('ALREADY_MEMBER');
  });

  it('참여하면 MEMBER로 등록되고 같은 멱등 키는 같은 번치를 돌려주며 다시 참여하면 ALREADY_MEMBER다', async () => {
    const first = unwrapEnvelope<{ outcome: string; bunch: { id: number } }>(
      await (await join('MOCKJOIN', 'k-1')).json(),
    );
    const replay = unwrapEnvelope<{ outcome: string; bunch: { id: number } }>(
      await (await join('MOCKJOIN', 'k-1')).json(),
    );
    const again = unwrapEnvelope<{ outcome: string }>(await (await join('MOCKJOIN', 'k-2')).json());

    expect(first.outcome).toBe('JOINED');
    expect(replay.bunch.id).toBe(first.bunch.id);
    expect(again.outcome).toBe('ALREADY_MEMBER');
    expect(mockDb.get().memberships).toContainEqual({
      bunchId: first.bunch.id,
      memberId: MOCK_MY_MEMBER_ID,
      role: 'MEMBER',
    });
  });

  it('멱등 키가 없으면 400, 같은 키에 다른 초대는 409다', async () => {
    expect((await join('MOCKJOIN', null)).status).toBe(400);
    await join('MOCKJOIN', 'k-3');
    expect((await join('MOCK0001', 'k-3')).status).toBe(409);
  });

  it('공개 초대 조회는 로그인 없이 카드를 돌려주고, 없는 초대는 404 INVITE_001이다', async () => {
    const card = unwrapEnvelope<{ name: string }>(await api().get('invitations/MOCKJOIN').json());
    expect(card.name).toBe('여행가조');

    const missing = await api().get('invitations/NOPE0000', { throwHttpErrors: false });
    expect(missing.status).toBe(404);
  });
});

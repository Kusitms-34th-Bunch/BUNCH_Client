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

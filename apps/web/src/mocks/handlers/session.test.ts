import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { createSeedFor } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

const onboarding = async () => {
  const response = await fetch('/api/members/me/onboarding');
  const body = (await response.json()) as {
    data: { signupStatus: string; termsAccepted: boolean; defaultBunchId?: number } | null;
  };
  return { status: response.status, data: body.data };
};

describe('가짜 서버 세션 전환', () => {
  it('가입 중 세션은 약관 동의 → 가입 완료로 바뀌고, 소속 번치가 없다', async () => {
    mockDb.update(() => createSeedFor('signup-terms'));
    expect(await onboarding()).toMatchObject({
      status: 200,
      data: { signupStatus: 'IN_PROGRESS', termsAccepted: false },
    });

    await fetch('/api/auth/terms/agreements', { method: 'POST', body: '{}' });
    expect((await onboarding()).data).toMatchObject({ termsAccepted: true });

    await fetch('/api/members/me/registration', { method: 'POST' });
    const { data } = await onboarding();
    expect(data).toMatchObject({ signupStatus: 'COMPLETED' });
    expect(data?.defaultBunchId).toBeUndefined();
  });

  it('가입 때 선택 약관에 동의하면 추가 개인정보 동의와 출생연도·성별이 MY에 이어진다', async () => {
    mockDb.update(() => createSeedFor('signup-terms'));
    const additionalInfo = async () =>
      ((await (await fetch('/api/members/me/additional-info')).json()) as { data: unknown }).data;

    await fetch('/api/auth/terms/agreements', {
      method: 'POST',
      body: JSON.stringify({
        agreements: [{ type: 'DEMOGRAPHICS', version: 'd-1', agreed: true }],
      }),
    });
    expect(await additionalInfo()).toEqual({ consented: true });

    const body = new FormData();
    body.append(
      'profile',
      new Blob(
        [
          JSON.stringify({
            nickname: '큐시즘',
            demographicsConsentVersion: 'd-1',
            birthYear: 2003,
          }),
        ],
        { type: 'application/json' },
      ),
    );
    await fetch('/api/members/me/registration', { method: 'POST', body });
    expect(await additionalInfo()).toEqual({ consented: true, birthYear: 2003 });
  });

  it('동의 버전 없이 가입하면 출생연도·성별을 저장하지 않는다', async () => {
    mockDb.update(() => createSeedFor('signup-terms'));
    const body = new FormData();
    body.append(
      'profile',
      new Blob([JSON.stringify({ nickname: '큐시즘', birthYear: 2003 })], {
        type: 'application/json',
      }),
    );
    await fetch('/api/members/me/registration', { method: 'POST', body });

    const response = await fetch('/api/members/me/additional-info');
    expect(((await response.json()) as { data: unknown }).data).toEqual({ consented: false });
  });

  it('로그아웃하면 가입 상태·세션 확인·재발급이 401이다', async () => {
    expect((await onboarding()).status).toBe(200);
    await fetch('/api/auth/logout', { method: 'POST' });

    expect((await onboarding()).status).toBe(401);
    expect((await fetch('/api/session')).status).toBe(401);
    expect((await fetch('/api/auth/reissue', { method: 'POST' })).status).toBe(401);
  });

  it('비로그인 세션은 처음부터 401이다', async () => {
    mockDb.update(() => createSeedFor('anonymous'));
    expect((await onboarding()).status).toBe(401);
  });
});

import { focusManager } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { clearPendingInvitation, savePendingInvitation } from '@/shared/lib/pendingInvitation';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { usePostLoginPath } from '../queries/session';
import { AuthGate } from './AuthGate';

const replace = vi.fn();
const navigation = vi.hoisted(() => ({ pathname: '/bunch' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => navigation.pathname,
}));

const DESTINATIONS = {
  bunchHome: '/bunch',
  bunchStart: '/onboarding',
  inviteEntry: '/onboarding/join/enter',
};

const respondWith = (onboarding: {
  signupStatus: 'IN_PROGRESS' | 'COMPLETED';
  termsAccepted: boolean;
  defaultBunchId?: number;
}) => server.use(http.get('/api/members/me/onboarding', () => ok({ memberId: 1, ...onboarding })));

const renderGate = () =>
  render(
    <AuthGate destinations={DESTINATIONS}>
      <p>보호된 화면</p>
    </AuthGate>,
    { wrapper: createQueryWrapper() },
  );

const protectedScreen = () => screen.queryByText('보호된 화면');
const loadingOverlay = () => document.querySelector('.bg-overlay-dim-subtle');

describe('AuthGate', () => {
  // 포커스 테스트가 중간에 실패해도 다음 테스트에 포커스 상태가 남지 않게 되돌림
  afterEach(() => focusManager.setFocused(undefined));

  beforeEach(() => {
    replace.mockClear();
    clearPendingInvitation();
    navigation.pathname = '/bunch';
    // 기본은 인트로를 본 사용자. 회원 테스트가 남긴 기록에 기대지 않게 매번 다시 둠
    window.localStorage.clear();
    window.localStorage.setItem('bunch:intro-seen', '1');
  });

  describe('보관된 초대(초대 링크로 들어온 사용자)', () => {
    it('로그인 화면에 있는 가입 완료 사용자를 번치 홈이 아니라 초대 진입으로 보낸다', async () => {
      savePendingInvitation('ABCD2345');
      navigation.pathname = '/login';
      respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
      renderGate();

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding/join/enter'));
      expect(replace).not.toHaveBeenCalledWith('/bunch');
    });

    it('보관된 초대가 없으면 기존처럼 번치 홈으로 보낸다', async () => {
      navigation.pathname = '/login';
      respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
      renderGate();

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    });

    it('다른 화면의 접근은 바꾸지 않는다(초대가 있어도 보호된 화면이 그대로 열림)', async () => {
      savePendingInvitation('ABCD2345');
      respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
      renderGate();

      expect(await screen.findByText('보호된 화면')).toBeTruthy();
      expect(replace).not.toHaveBeenCalled();
    });
  });

  it('상태를 확인하는 동안에는 화면 대신 로딩만 보인다', async () => {
    let release!: () => void;
    server.use(
      http.get('/api/members/me/onboarding', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true });
      }),
    );
    renderGate();

    expect(loadingOverlay()).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('로그인 상태를 확인하는 중이에요');
    expect(protectedScreen()).toBeNull();
    expect(replace).not.toHaveBeenCalled();

    // 요청을 끝내야 테스트가 끝난 뒤 끊긴 연결이 남지 않음
    await waitFor(() => expect(release).toBeTypeOf('function'));
    release();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
  });

  it('가입을 마친 사용자는 보호된 화면을 본다', async () => {
    respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(loadingOverlay()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('가입을 마친 사용자가 로그인 화면에 들어오면 번치 홈으로 보내고 로그인 화면은 보이지 않는다', async () => {
    navigation.pathname = '/login';
    respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    expect(protectedScreen()).toBeNull();
    expect(loadingOverlay()).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('화면을 이동하는 중이에요');
  });

  it('인트로를 본 적 없는 비로그인 사용자는 인트로로 보낸다', async () => {
    window.localStorage.clear();
    navigation.pathname = '/login';
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/intro'));
    expect(protectedScreen()).toBeNull();
  });

  it('인트로를 본 적 없어도 로그인한 사용자는 본 것으로 기록해 로그아웃 뒤 인트로를 보지 않는다', async () => {
    window.localStorage.clear();
    respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(window.localStorage.getItem('bunch:intro-seen')).toBe('1');
  });

  it('로그인하지 않은 사용자가 보호된 화면에 들어오면 로그인으로 보낸다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(protectedScreen()).toBeNull();
  });

  it('로그인하지 않은 사용자는 로그인 화면을 본다', async () => {
    navigation.pathname = '/login';
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));
    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('비로그인 상태를 다시 읽는 동안(탭 복귀 등)에도 로딩으로 바뀌지 않고 지금 화면을 유지한다', async () => {
    navigation.pathname = '/login';
    // 401은 재발급 뒤 한 번 더 요청되므로 횟수 대신 첫 화면 뒤부터만 붙잡음
    let holding = false;
    let release: (() => void) | undefined;
    server.use(
      http.get('/api/members/me/onboarding', async () => {
        if (holding) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        return fail(401, 'AUTH_001');
      }),
    );
    const client = createTestQueryClient();
    render(
      <AuthGate destinations={DESTINATIONS}>
        <p>보호된 화면</p>
      </AuthGate>,
      { wrapper: createQueryWrapper(client) },
    );
    expect(await screen.findByText('보호된 화면')).toBeInTheDocument();

    // 탭을 떠났다 돌아옴(비로그인은 바로 낡은 값이라 포커스 때 다시 읽음)
    holding = true;
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(release).toBeTypeOf('function'));
    // 다시 읽는 중에도 화면이 그대로(이전에는 데이터 없는 query가 로딩으로 돌아가 화면이 처음부터 다시 그려짐)
    expect(protectedScreen()).not.toBeNull();
    expect(loadingOverlay()).toBeNull();

    holding = false;
    release?.();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(protectedScreen()).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('회원으로 보던 중 다시 읽은 결과가 401이면(세션 만료) 로그인으로 보낸다', async () => {
    respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
    const client = createTestQueryClient();
    render(
      <AuthGate destinations={DESTINATIONS}>
        <p>보호된 화면</p>
      </AuthGate>,
      { wrapper: createQueryWrapper(client) },
    );
    expect(await screen.findByText('보호된 화면')).toBeTruthy();

    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));
    await client.refetchQueries();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(protectedScreen()).toBeNull();
    expect(loadingOverlay()).not.toBeNull();
  });

  it('약관에 동의하지 않은 가입 중 사용자가 다른 화면에 들어오면 약관으로 보낸다', async () => {
    respondWith({ signupStatus: 'IN_PROGRESS', termsAccepted: false });
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/signup/terms'));
    expect(protectedScreen()).toBeNull();
  });

  it('약관에 동의한 가입 중 사용자가 다른 화면에 들어오면 프로필로 보낸다', async () => {
    respondWith({ signupStatus: 'IN_PROGRESS', termsAccepted: true });
    renderGate();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/signup/profile'));
  });

  it('상태를 읽지 못하면 화면을 열지 않고 안내와 다시 시도를 보인다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(500, 'SERVER_ERROR')));
    renderGate();

    expect((await screen.findByRole('alert')).textContent).toBe(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('BUNCH');
    expect(screen.getByRole('main')).toBeTruthy();
    expect(protectedScreen()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('다시 시도해 상태를 읽으면 그 상태에 맞게 화면을 연다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(500, 'SERVER_ERROR')));
    renderGate();
    await screen.findByRole('alert');

    respondWith({ signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('로그인 직후 가입 상태를 읽는 동안에도 로그인 화면이 사라지지 않는다', async () => {
    navigation.pathname = '/login';
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));

    function LoginProbe() {
      const resolve = usePostLoginPath(DESTINATIONS);
      return <button onClick={() => void resolve()}>로그인 뒤 조회</button>;
    }
    render(
      <AuthGate destinations={DESTINATIONS}>
        <LoginProbe />
      </AuthGate>,
      { wrapper: createQueryWrapper() },
    );
    const button = await screen.findByRole('button', { name: '로그인 뒤 조회' });

    let release!: () => void;
    server.use(
      http.get('/api/members/me/onboarding', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return ok({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: false });
      }),
    );
    await userEvent.click(button);
    await waitFor(() => expect(release).toBeTypeOf('function'));

    // 읽는 중에도 화면이 로딩으로 바뀌지 않음(바뀌면 로그인 화면의 진행 상태가 사라짐)
    expect(screen.getByRole('button', { name: '로그인 뒤 조회' })).toBe(button);
    expect(loadingOverlay()).toBeNull();

    release();
    // 가입 중 사용자의 /login은 막지 않으므로 읽은 뒤에도 그대로 있음
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '로그인 뒤 조회' })).toBe(button);
  });
});

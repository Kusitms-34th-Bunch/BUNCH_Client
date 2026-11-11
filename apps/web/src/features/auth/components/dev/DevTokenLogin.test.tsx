import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevTokenLogin } from './DevTokenLogin';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
const resolvePostLogin = vi.hoisted(() => vi.fn());
vi.mock('../../queries/session', () => ({ usePostLoginPath: () => resolvePostLogin }));

const DESTINATIONS = {
  bunchHome: '/bunch',
  bunchStart: '/onboarding',
  inviteEntry: '/onboarding/join/enter',
};
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

// 로그인 화면의 로고 자리(`LoginEntry`가 `data-dev-login-trigger`를 붙임)
const renderWithLogo = () => {
  render(
    <>
      <div data-dev-login-trigger>로고</div>
      <DevTokenLogin destinations={DESTINATIONS} />
    </>,
  );
};
const openByTapping = async (times = 3) => {
  const logo = screen.getByText('로고');
  for (let i = 0; i < times; i += 1) await userEvent.click(logo);
};
const loginAs = async (nickname: string) => {
  renderWithLogo();
  await openByTapping();
  await userEvent.type(screen.getByLabelText('개발용 로그인 닉네임'), nickname);
  await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));
};

describe('DevTokenLogin', () => {
  it('처음에는 숨겨져 있고 로고를 3번 누르면 입력이 나타난다', async () => {
    renderWithLogo();
    expect(screen.queryByLabelText('개발용 로그인 닉네임')).toBeNull();

    await openByTapping(2);
    expect(screen.queryByLabelText('개발용 로그인 닉네임')).toBeNull();

    await userEvent.click(screen.getByText('로고'));
    expect(screen.getByLabelText('개발용 로그인 닉네임')).toBeTruthy();
  });

  it('닉네임을 보내고 성공하면 가입 상태로 정한 화면으로 이동한다(가입 중이면 push)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    resolvePostLogin.mockResolvedValue({ path: '/signup/terms', replace: false });

    await loginAs('dev');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/signup/terms'));
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dev/token',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ nickname: 'dev' }) }),
    );
  });

  it('가입을 마친 계정이면 기록을 남기지 않고 replace로 이동한다', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    resolvePostLogin.mockResolvedValue({ path: '/bunch', replace: true });

    await loginAs('dev');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    expect(push).not.toHaveBeenCalled();
  });

  it('실패하면 상태 코드를 알려 주고 이동하지 않는다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await loginAs('dev');

    expect((await screen.findByRole('alert')).textContent).toContain('404');
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('닉네임이 비어 있으면 요청하지 않는다', async () => {
    renderWithLogo();
    await openByTapping();

    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

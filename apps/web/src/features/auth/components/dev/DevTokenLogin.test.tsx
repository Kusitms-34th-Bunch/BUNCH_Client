import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevTokenLogin } from './DevTokenLogin';

const replace = vi.fn();
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('location', { replace });
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
      <DevTokenLogin />
    </>,
  );
  return screen.getByText('로고');
};
const openByTapping = async (times = 3) => {
  const logo = screen.getByText('로고');
  for (let i = 0; i < times; i += 1) await userEvent.click(logo);
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

  it('닉네임을 보내고 성공하면 로그인 화면을 새로 불러온다', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    renderWithLogo();
    await openByTapping();

    await userEvent.type(screen.getByLabelText('개발용 로그인 닉네임'), 'dev');
    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dev/token',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ nickname: 'dev' }) }),
    );
  });

  it('실패하면 상태 코드를 알려 주고 이동하지 않는다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    renderWithLogo();
    await openByTapping();

    await userEvent.type(screen.getByLabelText('개발용 로그인 닉네임'), 'dev');
    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    expect((await screen.findByRole('alert')).textContent).toContain('404');
    expect(replace).not.toHaveBeenCalled();
  });

  it('닉네임이 비어 있으면 요청하지 않는다', async () => {
    renderWithLogo();
    await openByTapping();

    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

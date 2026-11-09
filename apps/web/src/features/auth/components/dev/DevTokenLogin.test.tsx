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

describe('DevTokenLogin', () => {
  it('닉네임을 보내고 성공하면 로그인 화면을 새로 불러온다', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    render(<DevTokenLogin />);

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
    render(<DevTokenLogin />);

    await userEvent.type(screen.getByLabelText('개발용 로그인 닉네임'), 'dev');
    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    expect((await screen.findByRole('alert')).textContent).toContain('404');
    expect(replace).not.toHaveBeenCalled();
  });

  it('닉네임이 비어 있으면 요청하지 않는다', async () => {
    render(<DevTokenLogin />);

    await userEvent.click(screen.getByRole('button', { name: '개발용 로그인' }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

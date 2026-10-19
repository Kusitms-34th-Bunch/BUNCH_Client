import type * as DesignSystem from '@app/design-system';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOGIN_FAILURE_MESSAGE,
  LOGIN_PENDING_MESSAGE,
  type SocialLoginResult,
} from '../../hooks/useSocialLogin';
import { LoginEntry } from './LoginEntry';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const NEXT_PATH = '/next';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()`가 맡으므로 호출 인자만 확인한다
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const kakao = () => screen.getByRole('button', { name: '카카오 로그인' });
const google = () => screen.getByRole('button', { name: 'Google로 계속하기' });
const apple = () => screen.getByRole('button', { name: 'Apple로 계속하기' });

// 로그인 요청이 끝나는 시점을 테스트가 정하도록 미뤄 둔 Promise
const deferredSignIn = () => {
  let settle!: (_result: SocialLoginResult | Error) => void;
  const signIn = vi.fn(
    () =>
      new Promise<SocialLoginResult>((resolve, reject) => {
        settle = (result) => (result instanceof Error ? reject(result) : resolve(result));
      }),
  );
  const settleAndFlush = (result: SocialLoginResult | Error) =>
    act(async () => {
      settle(result);
      await Promise.resolve();
    });
  return { signIn, settle: settleAndFlush };
};

describe('LoginEntry', () => {
  beforeEach(() => {
    toast.mockClear();
    push.mockClear();
  });

  it('로고를 제목으로, 슬로건과 본문 영역(main)을 가진다', () => {
    render(<LoginEntry nextPath={NEXT_PATH} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Bunch' })).toBeTruthy();
    expect(screen.getByText('함께한 순간을, 우리 그룹의 기록으로')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('로그인 버튼을 카카오 → Google → Apple 순서로만 보여 준다', () => {
    render(<LoginEntry nextPath={NEXT_PATH} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '카카오 로그인',
      'Google로 계속하기',
      'Apple로 계속하기',
    ]);
  });

  it.each([
    ['kakao', kakao],
    ['google', google],
    ['apple', apple],
  ] as const)('%s 버튼을 누르면 그 소셜로 로그인을 시작한다', async (provider, button) => {
    const { signIn } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(button());

    expect(signIn).toHaveBeenCalledWith(provider);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('진행 중에는 누른 버튼만 진행 표시가 되고 나머지 둘은 비활성화된다', async () => {
    const { signIn } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(google());

    expect(google().getAttribute('aria-busy')).toBe('true');
    expect(google().hasAttribute('disabled')).toBe(false);
    expect(kakao().hasAttribute('disabled')).toBe(true);
    expect(apple().hasAttribute('disabled')).toBe(true);
  });

  it('진행 중에 같은 버튼을 다시 눌러도 첫 탭만 처리한다', async () => {
    const { signIn } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.dblClick(kakao());
    await userEvent.click(kakao());

    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('실패하면 안내 토스트를 보이고 버튼이 처음 상태로 돌아온다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(kakao());
    await settle(new Error('인증 실패'));

    expect(toast).toHaveBeenCalledWith(LOGIN_FAILURE_MESSAGE, expect.anything());
    expect(kakao().hasAttribute('aria-busy')).toBe(false);
    expect(google().hasAttribute('disabled')).toBe(false);
    expect(apple().hasAttribute('disabled')).toBe(false);
  });

  it('실패한 뒤에는 다시 로그인을 시도할 수 있다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(kakao());
    await settle(new Error('인증 실패'));
    await userEvent.click(apple());

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(signIn).toHaveBeenLastCalledWith('apple');
  });

  it('사용자가 로그인 창을 닫으면 토스트 없이 처음 상태로 돌아온다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(google());
    await settle('cancelled');

    expect(push).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(google().hasAttribute('aria-busy')).toBe(false);
    expect(kakao().hasAttribute('disabled')).toBe(false);
  });

  it('성공하면 다음 화면으로 이동하고 이동이 끝날 때까지 버튼을 잠근 채 둔다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(kakao());
    await settle('success');

    expect(push).toHaveBeenCalledWith(NEXT_PATH);
    expect(toast).not.toHaveBeenCalled();
    expect(kakao().getAttribute('aria-busy')).toBe('true');
    expect(google().hasAttribute('disabled')).toBe(true);
  });

  it('소셜 로그인이 연결되지 않은 동안에는 눌러도 아무 일도 일어나지 않는다', async () => {
    render(<LoginEntry nextPath={NEXT_PATH} />);

    await userEvent.click(kakao());

    expect(toast).not.toHaveBeenCalled();
    expect(kakao().hasAttribute('aria-busy')).toBe(false);
    expect(google().hasAttribute('disabled')).toBe(false);
    expect(apple().hasAttribute('disabled')).toBe(false);
  });

  it('진행 중에는 상태를 말로 알리고, 끝나면 비운다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);
    expect(screen.getByRole('status').textContent).toBe('');

    await userEvent.click(apple());
    expect(screen.getByRole('status').textContent).toBe(LOGIN_PENDING_MESSAGE);

    await settle('cancelled');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('실패 토스트는 하단 버튼 영역 위로 올려 띄운다', async () => {
    const { signIn, settle } = deferredSignIn();
    render(<LoginEntry signIn={signIn} nextPath={NEXT_PATH} />);

    await userEvent.click(kakao());
    await settle(new Error('인증 실패'));

    expect(toast.mock.calls[0]![1]!.bottomOffset).toBeGreaterThan(0);
  });

  it('앱 아이콘은 장식이라 이름이 없고 로고만 이미지 이름을 가진다', () => {
    render(<LoginEntry nextPath={NEXT_PATH} />);

    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual(['Bunch']);
  });
});

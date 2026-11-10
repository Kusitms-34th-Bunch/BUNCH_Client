import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Ref, useEffect, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntroScreen } from './IntroScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock. 재생을 바로 끝내고, fail이면 재생 실패를 알림
const lottie = { fail: false, playSegments: vi.fn() };
vi.mock('@/shared/lib/lottieLight', () => ({
  LottieLight: ({
    lottieRef,
    subscriptions,
  }: {
    lottieRef: Ref<unknown>;
    subscriptions: { complete: () => void; error: () => void };
  }) => {
    useImperativeHandle(lottieRef, () => ({
      playSegments: (segment: unknown) => {
        lottie.playSegments(segment);
        subscriptions.complete();
      },
      seek: () => {},
    }));
    useEffect(() => {
      if (lottie.fail) subscriptions.error();
      else subscriptions.complete();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <span data-testid="lottie" />;
  },
}));

const seen = () => window.localStorage.getItem('bunch:intro-seen');

beforeEach(() => {
  replace.mockClear();
  lottie.playSegments.mockClear();
  lottie.fail = false;
  window.localStorage.clear();
});

const toGuide = async () => {
  const user = userEvent.setup();
  render(<IntroScreen />);
  await screen.findByTestId('lottie');
  // 장면 1~3을 넘기면 브랜드 모션이 끝난 뒤 저절로 가이드
  for (let scene = 0; scene < 3; scene += 1) {
    await user.click(screen.getByRole('button', { name: '다음 장면' }));
  }
  expect(await screen.findByRole('heading', { name: /하나의 사진함에 모아요/ })).toBeTruthy();
  return user;
};

describe('IntroScreen', () => {
  it('Lottie 속 문구를 보조 기술에 장면마다 읽히고, 누르면 멈춘 곳부터 다음 멈춤까지 재생한다', async () => {
    const user = userEvent.setup();
    render(<IntroScreen />);
    await screen.findByTestId('lottie');

    expect(screen.getByText('함께한 순간이 모이는 공간, 번치에 오신 걸 환영해요!')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다음 장면' }));
    expect(screen.getByText('우리 모임이 함께 쓰는 하나의 계정, 번치')).toBeTruthy();
    expect(lottie.playSegments).toHaveBeenLastCalledWith([141, 360]);
  });

  it('브랜드 화면은 모션이 끝나면 누르지 않아도 가이드로 넘어간다', async () => {
    const user = userEvent.setup();
    render(<IntroScreen />);
    await screen.findByTestId('lottie');

    for (let scene = 0; scene < 3; scene += 1) {
      await user.click(screen.getByRole('button', { name: '다음 장면' }));
    }
    expect(lottie.playSegments).toHaveBeenLastCalledWith([540, 809]);
    expect(await screen.findByRole('heading', { name: /사진함에 모아요/ })).toBeTruthy();
  });

  it('애니메이션을 재생하지 못하면 가이드로 간다', async () => {
    lottie.fail = true;
    render(<IntroScreen />);

    expect(await screen.findByRole('heading', { name: /사진함에 모아요/ })).toBeTruthy();
  });

  it('「건너뛰기」는 본 것으로 기록하고 로그인으로 간다', async () => {
    const user = userEvent.setup();
    render(<IntroScreen />);

    await user.click(screen.getByRole('button', { name: '건너뛰기' }));
    expect(seen()).toBe('1');
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('가이드는 「다음」으로 4장을 넘기고 「시작하기」면 기록하고 로그인으로 간다', async () => {
    const user = await toGuide();

    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: /하나의 번들을 완성해요/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: /우리끼리 콕!/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: '4 / 4' })).toBeTruthy();
    expect(seen()).toBeNull();

    await user.click(screen.getByRole('button', { name: '시작하기' }));
    expect(seen()).toBe('1');
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('가이드는 왼쪽으로 밀면 다음 장, 오른쪽으로 밀면 그대로(앞으로만)', async () => {
    await toGuide();
    const area = screen.getByRole('heading', { name: /하나의 사진함에 모아요/ }).parentElement!;

    fireEvent.pointerDown(area, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(area, { clientX: 340, clientY: 400 });
    expect(screen.getByRole('heading', { name: /하나의 사진함에 모아요/ })).toBeTruthy();

    fireEvent.pointerDown(area, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(area, { clientX: 200, clientY: 410 });
    expect(screen.getByRole('heading', { name: /하나의 번들을 완성해요/ })).toBeTruthy();
  });
});

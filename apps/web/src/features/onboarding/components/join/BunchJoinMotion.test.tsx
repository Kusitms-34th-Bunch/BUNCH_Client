import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { BunchJoinMotion } from './BunchJoinMotion';

const replace = vi.fn();
const prefetch = vi.fn();
const router = { replace, prefetch };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// DOM 테스트 환경에서 로티를 재생할 수 없어 프레임·완료·오류 이벤트 대체
type PlayerProps = {
  subscriptions: {
    frame: (_event: { currentFrame: number }) => void;
    complete: () => void;
    error: () => void;
  };
};
vi.mock('lottie-react', () => ({
  LottieLight: ({ subscriptions }: PlayerProps) => (
    <div>
      <button onClick={() => subscriptions.frame({ currentFrame: 85 })}>85프레임</button>
      <button onClick={() => subscriptions.frame({ currentFrame: 88 })}>88프레임</button>
      <button onClick={() => subscriptions.frame({ currentFrame: 89 })}>89프레임</button>
      <button onClick={subscriptions.complete}>재생 끝</button>
      <button onClick={subscriptions.error}>재생 오류</button>
    </div>
  ),
}));

const setReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);

describe('BunchJoinMotion', () => {
  beforeEach(() => {
    replace.mockClear();
    prefetch.mockClear();
    setReducedMotion(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('보조기술에는 불러오는 중이라는 안내를 제목으로 전달하고 본문(main)을 가진다', async () => {
    render(<BunchJoinMotion />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '초대받은 번치 정보를 불러오는 중이에요.',
    );
    expect(screen.getByRole('main')).toBeTruthy();
    await screen.findByRole('button', { name: '재생 끝' });
  });

  it('재생 중 다음 초대장 페이지를 미리 불러온다', () => {
    render(<BunchJoinMotion />);

    expect(prefetch).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
    expect(replace).not.toHaveBeenCalled();
  });

  it('재생이 끝나면 초대 확인 화면으로 한 번만 replace한다', async () => {
    render(<BunchJoinMotion />);
    const done = await screen.findByRole('button', { name: '재생 끝' });

    act(() => {
      done.click();
      done.click();
    });

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
  });

  it('마지막 움직임이 끝나는 89프레임에 정지 구간 없이 넘어간다', async () => {
    render(<BunchJoinMotion />);
    const early = await screen.findByRole('button', { name: '88프레임' });

    act(() => {
      early.click();
    });
    expect(replace).not.toHaveBeenCalled();

    act(() => {
      screen.getByRole('button', { name: '89프레임' }).click();
      screen.getByRole('button', { name: '재생 끝' }).click();
    });

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
  });

  it('마지막 구간에 화면 전체로 퍼지는 장식 배경을 표시한다', async () => {
    const { container } = render(<BunchJoinMotion />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    await screen.findByRole('button', { name: '85프레임' });
    act(() => {
      screen.getByRole('button', { name: '85프레임' }).click();
    });

    const reveal = container.querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(reveal).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();

    act(() => {
      screen.getByRole('button', { name: '88프레임' }).click();
    });
    expect(reveal?.style.clipPath).toBe('circle(100% at 50% var(--reveal-y))');
    expect(replace).not.toHaveBeenCalled();
  });

  it('중간 프레임을 건너뛰어도 배경 완성 상태를 렌더한 뒤 이동한다', async () => {
    const { container } = render(<BunchJoinMotion />);
    const last = await screen.findByRole('button', { name: '89프레임' });
    act(() => last.click());

    expect(container.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.clipPath).toBe(
      'circle(100% at 50% var(--reveal-y))',
    );
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });

  it('재생에 실패해도 화면이 멈추지 않고 다음으로 넘어간다', async () => {
    render(<BunchJoinMotion />);
    const fail = await screen.findByRole('button', { name: '재생 오류' });

    act(() => {
      fail.click();
    });

    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
  });

  it('동작 줄이기에서는 로티를 그리지 않고 잠깐 뒤 넘어간다', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    render(<BunchJoinMotion />);

    expect(screen.queryByRole('button', { name: '재생 끝' })).toBeNull();
    expect(replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
  });
});

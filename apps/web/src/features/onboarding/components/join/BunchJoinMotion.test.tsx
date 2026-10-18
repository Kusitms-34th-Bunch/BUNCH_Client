import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { BunchJoinMotion } from './BunchJoinMotion';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

// 로티 재생은 jsdom에서 그릴 수 없어 끝남·오류 이벤트만 흉내 내는 껍데기로 대체한다(모양은 테스트하지 않는다)
type PlayerProps = { subscriptions: { complete: () => void; error: () => void } };
vi.mock('lottie-react', () => ({
  LottieLight: ({ subscriptions }: PlayerProps) => (
    <div>
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

  it('재생이 끝나면 초대 확인 화면으로 한 번만 replace한다', async () => {
    render(<BunchJoinMotion />);
    const done = await screen.findByRole('button', { name: '재생 끝' });

    act(() => {
      done.click();
      done.click();
    });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation);
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

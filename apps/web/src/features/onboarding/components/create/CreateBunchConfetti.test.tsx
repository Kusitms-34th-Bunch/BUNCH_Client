import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFETTI_DURATION_MS, CONFETTI_PIECES } from '../../constants/confetti';
import { CreateBunchConfetti } from './CreateBunchConfetti';

const cancel = vi.fn();
const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel }));

const mockReducedMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce })),
  );

describe('CreateBunchConfetti', () => {
  beforeEach(() => {
    animate.mockClear();
    cancel.mockClear();
    Element.prototype.animate = animate as unknown as Element['animate'];
    mockReducedMotion(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('조각마다 위치·회전·불투명도 세 가지를 1.5초 동안 재생한다', () => {
    const { container } = render(<CreateBunchConfetti />);

    expect(container.querySelectorAll('span')).toHaveLength(CONFETTI_PIECES.length);
    expect(animate).toHaveBeenCalledTimes(CONFETTI_PIECES.length * 3);
    for (const [, options] of animate.mock.calls as unknown as [
      unknown,
      KeyframeAnimationOptions,
    ][]) {
      expect(options.duration).toBe(CONFETTI_DURATION_MS);
    }
  });

  it('보조기기에는 장식이라 숨긴다', () => {
    const { container } = render(<CreateBunchConfetti />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('재생이 끝나면 조각을 치운다', async () => {
    const { container } = render(<CreateBunchConfetti />);

    await waitFor(() => expect(container.firstElementChild).toBeNull());
  });

  it('화면이 사라지면 재생을 취소한다', () => {
    const { unmount } = render(<CreateBunchConfetti />);

    unmount();

    expect(cancel).toHaveBeenCalledTimes(CONFETTI_PIECES.length * 3);
  });

  it('움직임 줄이기 설정이면 그리지도 재생하지도 않는다', async () => {
    mockReducedMotion(true);

    const { container } = render(<CreateBunchConfetti />);

    await waitFor(() => expect(container.firstElementChild).toBeNull());
    expect(animate).not.toHaveBeenCalled();
  });
});

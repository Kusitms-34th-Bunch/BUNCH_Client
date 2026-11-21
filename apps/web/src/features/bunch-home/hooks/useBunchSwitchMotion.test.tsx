import { act, render } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBunchSwitchMotion } from './useBunchSwitchMotion';

type Motion = ReturnType<typeof useBunchSwitchMotion>;

const animate = vi.fn((_keyframes: unknown, _options: unknown) => ({
  finished: Promise.resolve(),
  cancel: vi.fn(),
}));

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    value: animate,
    configurable: true,
    writable: true,
  });
});
afterEach(() => {
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
  animate.mockClear();
});

let motion: Motion | undefined;
const keepMotion = (value: Motion) => {
  motion = value;
};
function Screen({ bunchId }: { bunchId: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const value = useBunchSwitchMotion(contentRef, bunchId);
  useEffect(() => keepMotion(value));
  return (
    <div data-app-background="orange-50" data-testid="root">
      <main>
        <div key={bunchId} ref={contentRef}>
          <button type="button">{bunchId}</button>
        </div>
      </main>
    </div>
  );
}

const clones = () => document.querySelectorAll('[data-bunch-switch-snapshot]');

describe('useBunchSwitchMotion', () => {
  it('고르면 지금 화면을 붙잡아 두고, 새 번치가 그려지면 두 화면을 움직인 뒤 치운다', async () => {
    const { rerender } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    expect(clones()).toHaveLength(1);
    // 붙잡은 화면은 상태 바 색 판단에서 빠짐
    expect(clones()[0]!.hasAttribute('data-app-background')).toBe(false);
    // 붙잡은 화면은 보조기술에서 빠지고, 터치는 받되(아래 화면으로 지나가지 않게) 초점은 받지 않음
    expect(clones()[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(clones()[0]!.hasAttribute('inert')).toBe(false);
    expect(clones()[0]!.querySelector('button')!.tabIndex).toBe(-1);

    rerender(<Screen bunchId="2" />);

    expect(animate).toHaveBeenCalledTimes(2);
    await act(() => Promise.resolve());
    expect(clones()).toHaveLength(0);
  });

  it('전환에 실패하면 붙잡은 화면을 바로 치우고 움직이지 않는다', () => {
    render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    act(() => motion!.cancel());

    expect(clones()).toHaveLength(0);
    expect(animate).not.toHaveBeenCalled();
  });

  it('기다리는 사이 화면이 사라지면 붙잡은 화면도 치운다', () => {
    const { unmount } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    unmount();

    expect(clones()).toHaveLength(0);
  });
});

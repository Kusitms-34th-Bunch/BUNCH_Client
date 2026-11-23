import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollInHistory } from './useScrollInHistory';

function Screen({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useScrollInHistory(ref, ready);
  return (
    <main>
      <h1 ref={ref}>제목</h1>
    </main>
  );
}

// 스크롤 범위를 넘는 값은 브라우저처럼 최대값으로 자름
let maxScroll = 0;
function clampScroll(main: HTMLElement) {
  let top = 0;
  Object.defineProperty(main, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = Math.min(value, maxScroll);
    },
  });
}

describe('useScrollInHistory 복원', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'setTimeout',
        'clearTimeout',
        'performance',
      ],
    });
    window.history.replaceState({ pageScroll: 2400 }, '');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '');
  });

  const mount = () => {
    const view = render(<Screen ready={false} />);
    clampScroll(view.container.querySelector('main')!);
    view.rerender(<Screen ready />);
    return view.container.querySelector('main')!;
  };

  it('높이가 모자라 잘렸으면 높이가 생긴 뒤 저장 위치까지 내리고 잘린 값은 저장하지 않음', () => {
    maxScroll = 1000;
    const main = mount();
    expect(main.scrollTop).toBe(1000);

    fireEvent.scroll(main);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect((window.history.state as { pageScroll: number }).pageScroll).toBe(2400);

    maxScroll = 3000;
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(main.scrollTop).toBe(2400);
  });

  it('기다리는 동안 직접 조작하면 다시 맞추지 않음', () => {
    maxScroll = 1000;
    const main = mount();
    // 보조 키만 누른 것은 조작으로 보지 않음
    fireEvent.keyDown(document, { key: 'Shift' });
    expect(main).toHaveAttribute('data-scroll-restoring');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(main).not.toHaveAttribute('data-scroll-restoring');

    maxScroll = 3000;
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(main.scrollTop).toBe(1000);
  });

  it('기다리는 동안 터치 없이 다른 주체가 움직이면 멈추고 그 위치를 저장', () => {
    maxScroll = 1000;
    const main = mount();
    expect(main).toHaveAttribute('data-scroll-restoring');
    main.scrollTop = 600;

    maxScroll = 3000;
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(main.scrollTop).toBe(600);
    expect(main).not.toHaveAttribute('data-scroll-restoring');
    expect((window.history.state as { pageScroll: number }).pageScroll).toBe(600);
  });

  it('상한이 지나면 더 맞추지 않음', () => {
    maxScroll = 1000;
    const main = mount();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(main).not.toHaveAttribute('data-scroll-restoring');

    maxScroll = 3000;
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(main.scrollTop).toBe(1000);
  });

  it('높이가 충분하면 바로 복원', () => {
    maxScroll = 3000;
    expect(mount().scrollTop).toBe(2400);
  });
});

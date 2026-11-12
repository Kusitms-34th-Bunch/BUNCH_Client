import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoBoxMore } from './PhotoBoxMore';

type ObserverCallback = (_entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;

let callbacks: ObserverCallback[] = [];
let disconnects = 0;

beforeEach(() => {
  callbacks = [];
  disconnects = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: ObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      disconnect() {
        disconnects += 1;
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const notify = (isIntersecting: boolean) => act(() => callbacks.at(-1)?.([{ isIntersecting }]));

describe('PhotoBoxMore 스크롤 재시도', () => {
  it('실패한 순간 끝이 이미 보이고 있으면 바로 다시 보내지 않고, 벗어났다가 다시 보일 때 한 번만 재시도한다', () => {
    const onRetry = vi.fn();
    render(<PhotoBoxMore state="error" onRetry={onRetry} />);

    notify(true);
    expect(onRetry).not.toHaveBeenCalled();

    notify(false);
    notify(true);
    expect(onRetry).toHaveBeenCalledTimes(1);

    // 다시 보여도 그 사이 벗어나지 않았으면 또 보내지 않음
    notify(true);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('호출하는 쪽이 렌더마다 새 함수를 줘도 관찰을 다시 시작하지 않고 최신 함수를 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<PhotoBoxMore state="error" onRetry={first} />);
    notify(false);

    view.rerender(<PhotoBoxMore state="error" onRetry={second} />);
    notify(true);

    expect(callbacks).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('실패 상태가 아니면 관찰하지 않는다', () => {
    render(<PhotoBoxMore state="loading" onRetry={vi.fn()} />);
    expect(callbacks).toHaveLength(0);
  });

  it('실패에서 벗어나면 관찰을 끝낸다', () => {
    const view = render(<PhotoBoxMore state="error" onRetry={vi.fn()} />);
    view.rerender(<PhotoBoxMore state="loading" onRetry={vi.fn()} />);
    expect(disconnects).toBe(1);
  });
});

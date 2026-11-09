import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useKeyboardOpen } from './useKeyboardOpen';

const stubViewport = (height: number) => {
  const viewport = Object.assign(new EventTarget(), { height, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
  return viewport;
};

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
});

describe('useKeyboardOpen', () => {
  it('보이는 높이가 키보드만큼 줄면 true, 돌아오면 false', () => {
    const viewport = stubViewport(window.innerHeight);
    const { result } = renderHook(() => useKeyboardOpen());
    expect(result.current).toBe(false);

    viewport.height = window.innerHeight - 300;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(result.current).toBe(true);

    viewport.height = window.innerHeight;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(result.current).toBe(false);
  });

  it('주소 표시줄처럼 조금 줄거나 visualViewport가 없으면 false', () => {
    const viewport = stubViewport(window.innerHeight - 60);
    const { result, unmount } = renderHook(() => useKeyboardOpen());
    expect(result.current).toBe(false);
    unmount();
    expect(viewport.height).toBe(window.innerHeight - 60);

    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    expect(renderHook(() => useKeyboardOpen()).result.current).toBe(false);
  });
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClientNow } from './useClientNow';

const setVisibility = (state: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

describe('useClientNow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('다시 보일 때 기준 시각을 갱신하고, 숨겨질 때는 그대로 둔다', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const { result } = renderHook(() => useClientNow());
    expect(result.current).toBe(1000);

    now.mockReturnValue(2000);
    setVisibility('hidden');
    expect(result.current).toBe(1000);

    setVisibility('visible');
    expect(result.current).toBe(2000);
  });
});

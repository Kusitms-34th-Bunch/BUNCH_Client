import { renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, it } from 'vitest';
import { useMountedRef } from '@/shared/hooks/useMountedRef';

it('붙어 있는 동안 true이고 떼어 내면 false가 된다', () => {
  const { result, unmount } = renderHook(() => useMountedRef());
  expect(result.current.current).toBe(true);

  unmount();
  expect(result.current.current).toBe(false);
});

it('Strict Mode의 떼었다 다시 붙이기 뒤에도 true로 돌아온다', () => {
  const { result } = renderHook(() => useMountedRef(), { wrapper: StrictMode });
  expect(result.current.current).toBe(true);
});

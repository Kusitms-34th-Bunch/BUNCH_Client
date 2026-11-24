import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useExitableOpen } from '@/shared/hooks/overlay/useExitableOpen';

it('닫으면 모션이 끝날 때까지 그림은 남고, 끝난 뒤에 뺀다', () => {
  const { result } = renderHook(() => useExitableOpen());

  act(() => result.current.toggle());
  expect(result.current).toMatchObject({ open: true, mounted: true });

  act(() => result.current.close());
  expect(result.current).toMatchObject({ open: false, mounted: true });

  act(() => result.current.exited());
  expect(result.current).toMatchObject({ open: false, mounted: false });
});

it('hide는 모션 없이 바로 닫고 뺀다', () => {
  const { result } = renderHook(() => useExitableOpen());
  act(() => result.current.toggle());

  act(() => result.current.hide());
  expect(result.current).toMatchObject({ open: false, mounted: false });
});

it('열린 상태에서 다시 누르면 닫힘 모션으로 들어간다', () => {
  const { result } = renderHook(() => useExitableOpen());
  act(() => result.current.toggle());

  act(() => result.current.toggle());
  expect(result.current).toMatchObject({ open: false, mounted: true });
});

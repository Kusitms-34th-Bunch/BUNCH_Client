import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useBackOr } from './useBackOr';

const router = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

const withHistory = (length: number) =>
  vi.spyOn(window.history, 'length', 'get').mockReturnValue(length);

it('기록이 있으면 뒤로 간다', () => {
  withHistory(2);
  renderHook(() => useBackOr()).result.current('/bunch');

  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
});

it('직접 진입이라 기록이 없으면 대체 경로로 바꾼다', () => {
  withHistory(1);
  renderHook(() => useBackOr()).result.current('/bunch');

  expect(router.replace).toHaveBeenCalledWith('/bunch');
  expect(router.back).not.toHaveBeenCalled();
});

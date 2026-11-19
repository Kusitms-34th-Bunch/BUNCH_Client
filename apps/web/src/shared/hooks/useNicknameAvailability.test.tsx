import type * as DesignSystem from '@app/design-system';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameCheckResult } from '../api/nameAvailability';
import { CHECK_FAILURE_MESSAGE, useNicknameAvailability } from './useNicknameAvailability';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 0.5초 뒤 호출과 그 결과 반영까지 시간 진행
const settle = () => act(() => vi.advanceTimersByTimeAsync(500));

describe('useNicknameAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('확인 함수가 없으면 확인하지 않고 idle이다', async () => {
    const { result } = renderHook(() => useNicknameAvailability('지원'));
    await settle();

    expect(result.current).toBe('idle');
  });

  it('닉네임이 비어 있으면 확인하지 않는다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { result } = renderHook(() => useNicknameAvailability('', check));
    await settle();

    expect(check).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('입력이 바뀐 직후에는 확인 중이고 0.5초 뒤에 호출한다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { result } = renderHook(() => useNicknameAvailability('지원', check));

    expect(result.current).toBe('checking');
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(check).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(check).toHaveBeenCalledWith('지원');
    expect(result.current).toBe('available');
  });

  it('사용 중인 닉네임이면 taken이다', async () => {
    const check = vi.fn(() => Promise.resolve('taken' as const));
    const { result } = renderHook(() => useNicknameAvailability('지원', check));
    await settle();

    expect(result.current).toBe('taken');
  });

  it('입력을 계속 바꾸면 마지막 값으로 한 번만 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지' },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ value: '지원' });
    await settle();

    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith('지원');
  });

  it('닉네임이 바뀌면 이전 결과를 쓰지 않고 다시 확인 중이 된다', async () => {
    const check = vi.fn(() => Promise.resolve('taken' as const));
    const { result, rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지원' },
    });
    await settle();
    expect(result.current).toBe('taken');

    rerender({ value: '지원이' });

    expect(result.current).toBe('checking');
  });

  it('같은 닉네임으로 되돌아와도 이전 결과를 쓰지 않고 다시 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve('taken' as const));
    const { result, rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지원' },
    });
    await settle();
    expect(result.current).toBe('taken');

    rerender({ value: '하나' });
    rerender({ value: '지원' });

    expect(result.current).toBe('checking');
    await settle();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('remember면 확인한 값으로 돌아왔을 때 다시 묻지 않고 바로 결과를 보인다', async () => {
    const check = vi.fn(() => Promise.resolve('taken' as const));
    const { result, rerender } = renderHook(
      ({ value }) => useNicknameAvailability(value, check, { remember: true }),
      { initialProps: { value: '지원' } },
    );
    await settle();

    rerender({ value: '하나' });
    rerender({ value: '지원' });

    expect(result.current).toBe('taken');
    await settle();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('remember면 결과를 받은 뒤 포커스가 바뀌어도 결과를 유지하고 다시 묻지 않는다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { result, rerender } = renderHook(
      ({ immediate }) => useNicknameAvailability('지원', check, { remember: true, immediate }),
      { initialProps: { immediate: false } },
    );
    await settle();

    rerender({ immediate: true });
    await settle();
    rerender({ immediate: false });
    await settle();

    expect(result.current).toBe('available');
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('remember여도 실패한 값은 기억하지 않고 다시 확인한다', async () => {
    const check = vi
      .fn<(_nickname: string) => Promise<NameCheckResult>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue('available');
    const { result, rerender } = renderHook(
      ({ value }) => useNicknameAvailability(value, check, { remember: true }),
      { initialProps: { value: '지원' } },
    );
    await settle();
    expect(result.current).toBe('failed');

    rerender({ value: '하나' });
    rerender({ value: '지원' });

    expect(result.current).toBe('checking');
    await settle();
    expect(result.current).toBe('available');
  });

  it('immediate면 대기 없이 바로 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { result } = renderHook(() =>
      useNicknameAvailability('지원', check, { immediate: true }),
    );

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(check).toHaveBeenCalledWith('지원');
    expect(result.current).toBe('available');
  });

  it('대기 중에 immediate로 바뀌면 남은 대기 없이 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve('available' as const));
    const { rerender } = renderHook(
      ({ immediate }) => useNicknameAvailability('지원', check, { immediate }),
      { initialProps: { immediate: false } },
    );
    await act(() => vi.advanceTimersByTimeAsync(100));
    rerender({ immediate: true });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(check).toHaveBeenCalledTimes(1);
  });

  it('렌더마다 새 함수를 넘겨도 같은 닉네임을 다시 확인하지 않는다', async () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(
      ({ value }) =>
        useNicknameAvailability(value, (nickname) => {
          calls.push(nickname);
          return Promise.resolve('available' as const);
        }),
      { initialProps: { value: '지원' } },
    );
    await settle();
    rerender({ value: '지원' });
    await settle();

    expect(result.current).toBe('available');
    expect(calls).toEqual(['지원']);
  });

  it('닉네임이 바뀐 뒤 늦게 도착한 응답은 무시한다', async () => {
    let resolveFirst!: (_result: NameCheckResult) => void;
    const check = vi
      .fn<(_nickname: string) => Promise<NameCheckResult>>()
      .mockImplementationOnce(
        () => new Promise<NameCheckResult>((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValue('available');
    const { result, rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지원' },
    });
    await settle();

    rerender({ value: '지원이' });
    await act(() => {
      resolveFirst('taken');
      return Promise.resolve();
    });
    expect(result.current).toBe('checking');

    await settle();
    expect(result.current).toBe('available');
  });

  it('확인이 실패하면 failed이고 안내 토스트를 보인다', async () => {
    const check = vi.fn(() => Promise.reject(new Error('network')));
    const { result } = renderHook(() => useNicknameAvailability('지원', check));
    await settle();

    expect(result.current).toBe('failed');
    expect(toast).toHaveBeenCalledWith(CHECK_FAILURE_MESSAGE);
  });

  it('notifyFailure가 false면 실패해도 토스트 없이 failed만 알린다', async () => {
    const check = vi.fn(() => Promise.reject(new Error('network')));
    const { result } = renderHook(() =>
      useNicknameAvailability('지원', check, { notifyFailure: false }),
    );
    await settle();

    expect(result.current).toBe('failed');
    expect(toast).not.toHaveBeenCalled();
  });
});

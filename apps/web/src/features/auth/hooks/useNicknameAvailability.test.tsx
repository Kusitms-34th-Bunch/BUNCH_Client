import type * as DesignSystem from '@app/design-system';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK_FAILURE_MESSAGE, useNicknameAvailability } from './useNicknameAvailability';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()`가 맡으므로 호출 인자만 확인한다
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 0.5초가 지나 호출이 일어나고 그 결과가 반영될 때까지 시간을 보낸다
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
    const check = vi.fn(() => Promise.resolve(true));
    const { result } = renderHook(() => useNicknameAvailability('', check));
    await settle();

    expect(check).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('입력이 바뀐 직후에는 확인 중이고 0.5초 뒤에 호출한다', async () => {
    const check = vi.fn(() => Promise.resolve(true));
    const { result } = renderHook(() => useNicknameAvailability('지원', check));

    expect(result.current).toBe('checking');
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(check).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(check).toHaveBeenCalledWith('지원');
    expect(result.current).toBe('available');
  });

  it('사용 중인 닉네임이면 taken이다', async () => {
    const check = vi.fn(() => Promise.resolve(false));
    const { result } = renderHook(() => useNicknameAvailability('지원', check));
    await settle();

    expect(result.current).toBe('taken');
  });

  it('입력을 계속 바꾸면 마지막 값으로 한 번만 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve(true));
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
    const check = vi.fn(() => Promise.resolve(false));
    const { result, rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지원' },
    });
    await settle();
    expect(result.current).toBe('taken');

    rerender({ value: '지원이' });

    expect(result.current).toBe('checking');
  });

  it('같은 닉네임으로 되돌아와도 이전 결과를 쓰지 않고 다시 확인한다', async () => {
    const check = vi.fn(() => Promise.resolve(false));
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

  it('렌더마다 새 함수를 넘겨도 같은 닉네임을 다시 확인하지 않는다', async () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(
      ({ value }) =>
        useNicknameAvailability(value, (nickname) => {
          calls.push(nickname);
          return Promise.resolve(true);
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
    let resolveFirst!: (_available: boolean) => void;
    const check = vi
      .fn<(_nickname: string) => Promise<boolean>>()
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => (resolveFirst = resolve)))
      .mockResolvedValue(true);
    const { result, rerender } = renderHook(({ value }) => useNicknameAvailability(value, check), {
      initialProps: { value: '지원' },
    });
    await settle();

    rerender({ value: '지원이' });
    await act(() => {
      resolveFirst(false);
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
});

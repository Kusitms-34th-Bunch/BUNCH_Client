import { ApiError } from '@app/api-core';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKeys } from './useIdempotencyKeys';

const rejection = (status: number) =>
  new ApiError({ message: '거절', category: 'validation', status });

describe('useIdempotencyKeys', () => {
  it('같은 요청은 같은 키, 다른 요청은 다른 키', () => {
    const { result } = renderHook(() => useIdempotencyKeys());
    const first = result.current.keyFor('a');

    expect(result.current.keyFor('a')).toBe(first);
    expect(result.current.keyFor('b')).not.toBe(first);
  });

  it('응답을 못 받았거나 5xx·408·429면 다시 보낼 때 같은 키를 씀', () => {
    const { result } = renderHook(() => useIdempotencyKeys());
    const key = result.current.keyFor('a');

    result.current.settle('a', new TypeError('Failed to fetch'));
    result.current.settle('a', rejection(500));
    result.current.settle('a', rejection(408));
    result.current.settle('a', rejection(429));

    expect(result.current.keyFor('a')).toBe(key);
  });

  it('성공했거나 서버가 확정 거절(4xx)하면 다음은 새 키', () => {
    const { result } = renderHook(() => useIdempotencyKeys());
    const first = result.current.keyFor('a');
    result.current.settle('a');
    const second = result.current.keyFor('a');
    result.current.settle('a', rejection(409));

    expect(second).not.toBe(first);
    expect(result.current.keyFor('a')).not.toBe(second);
  });
});

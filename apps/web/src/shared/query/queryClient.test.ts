import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from './queryClient';

const retryOf = () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('retry 함수가 아님');
  return retry;
};

describe('createQueryClient', () => {
  it('네트워크 오류와 5xx는 한 번만 재시도한다', () => {
    const retry = retryOf();
    const network = new ApiError({ message: 'offline', category: 'network' });
    const server = new ApiError({ message: 'down', category: 'server', status: 503 });

    expect(retry(0, network)).toBe(true);
    expect(retry(0, server)).toBe(true);
    expect(retry(1, server)).toBe(false);
  });

  it('4xx와 알 수 없는 오류는 재시도하지 않는다', () => {
    const retry = retryOf();

    expect(retry(0, new ApiError({ message: 'bad', category: 'validation', status: 400 }))).toBe(
      false,
    );
    expect(retry(0, new ApiError({ message: 'auth', category: 'auth', status: 401 }))).toBe(false);
    expect(retry(0, new Error('boom'))).toBe(false);
  });

  it('mutation은 재시도하지 않는다', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});

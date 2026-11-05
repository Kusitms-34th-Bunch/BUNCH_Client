import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdempotencyKey } from './idempotencyKey';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createIdempotencyKey', () => {
  it('UUID v4 형식이고 호출마다 다르다', () => {
    const first = createIdempotencyKey();
    const second = createIdempotencyKey();
    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });

  it('randomUUID가 없는 환경(http IP 접속)에서도 UUID v4를 만든다', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect(createIdempotencyKey()).toMatch(UUID_V4);
  });
});

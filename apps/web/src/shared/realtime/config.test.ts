import { afterEach, describe, expect, it, vi } from 'vitest';
import { realtimeUrl } from './config';

afterEach(() => vi.unstubAllEnvs());

it('운영 빌드에서는 localhost라도 ws:를 쓰지 않는다', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:8080/ws');
  expect(realtimeUrl()).toBeUndefined();
});

describe('realtimeUrl', () => {
  it.each([
    ['wss://api.example.com/ws', 'wss://api.example.com/ws'],
    ['ws://localhost:8080/ws', 'ws://localhost:8080/ws'],
    ['ws://127.0.0.1:8080/ws', 'ws://127.0.0.1:8080/ws'],
    ['ws://api.example.com/ws', undefined],
    ['wss://api.example.com/ws?token=a', undefined],
    ['wss://user:pass@api.example.com/ws', undefined],
    ['https://api.example.com/ws', undefined],
    ['not a url', undefined],
    ['', undefined],
  ])('%s → %s', (value, expected) => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', value);
    expect(realtimeUrl()).toBe(expected);
  });
});

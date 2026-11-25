import { afterEach, describe, expect, it, vi } from 'vitest';
import { realtimeUrl } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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
    ['wss://api.example.com/ws?', undefined],
    ['wss://api.example.com/ws#', undefined],
    ['wss://api.example.com/ws#a', undefined],
    ['wss://user:pass@api.example.com/ws', undefined],
    ['https://api.example.com/ws', undefined],
    ['not a url', undefined],
    ['', undefined],
  ])('%s → %s', (value, expected) => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', value);
    expect(realtimeUrl()).toBe(expected);
  });
});

it('TestFlight 테스터용 쉘은 개발 WS 주소를 쓰고, 없으면 운영 주소 대신 연결하지 않는다(#581)', () => {
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'wss://api.example.com/ws');
  vi.stubEnv('NEXT_PUBLIC_WS_URL_STAGING', 'wss://dev.example.com/ws');
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone) BunchShell/staging' });
  expect(realtimeUrl()).toBe('wss://dev.example.com/ws');

  vi.stubEnv('NEXT_PUBLIC_WS_URL_STAGING', '');
  expect(realtimeUrl()).toBeUndefined();

  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone)' });
  expect(realtimeUrl()).toBe('wss://api.example.com/ws');
});

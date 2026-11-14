import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeStatus, StompConnectionOptions } from '@/shared/realtime/stompConnection';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bundleKeys } from '../queries/keys';
import { useBundleRealtime } from './useBundleRealtime';

const connections = vi.hoisted(() => [] as FakeConnection[]);

type FakeConnection = {
  options: StompConnectionOptions;
  subscribed: string[];
  started: boolean;
  stopped: boolean;
  retried: number;
};

vi.mock('@/shared/realtime/stompConnection', () => ({
  createStompConnection: (options: StompConnectionOptions) => {
    const fake: FakeConnection = {
      options,
      subscribed: [],
      started: false,
      stopped: false,
      retried: 0,
    };
    connections.push(fake);
    return {
      start: () => {
        fake.started = true;
      },
      stop: () => {
        fake.stopped = true;
      },
      retryNow: () => {
        fake.retried += 1;
      },
      subscribe: (destination: string) => {
        fake.subscribed.push(destination);
        return () => undefined;
      },
      publish: () => false,
      status: () => 'idle',
    };
  },
}));

const fetchWsToken = vi.hoisted(() => vi.fn());
vi.mock('@/shared/realtime/wsToken', () => ({ fetchWsToken }));

const render = (active = true) => {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const hook = renderHook(() => useBundleRealtime('1', '2', active), {
    wrapper: createQueryWrapper(client),
  });
  return { ...hook, invalidate };
};

const emit = (status: RealtimeStatus) => {
  act(() => connections.at(-1)?.options.onStatus?.(status));
};

beforeEach(() => {
  connections.length = 0;
  fetchWsToken.mockReset();
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'wss://api.example.com/ws');
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useBundleRealtime', () => {
  it('주소가 없거나 가짜 서버 모드이면 연결하지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    expect(render().result.current.enabled).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'wss://api.example.com/ws');
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');
    expect(render().result.current.enabled).toBe(false);
    expect(connections).toHaveLength(0);
  });

  it('초안이 열려 있지 않으면(발행·삭제 뒤) 연결하지 않는다', () => {
    const { result } = render(false);

    expect(result.current.enabled).toBe(false);
    expect(connections).toHaveLength(0);
  });

  it('연결하면서 세 destination을 구독하고 화면을 떠나면 연결을 닫는다', () => {
    const { unmount } = render();

    expect(connections).toHaveLength(1);
    expect(connections[0]?.options.url).toBe('wss://api.example.com/ws');
    expect(connections[0]?.started).toBe(true);
    expect(connections[0]?.subscribed).toEqual([
      '/topic/bunches/1/bundles/2',
      '/user/queue/bundle-activity',
      '/user/queue/bundle-leases',
    ]);

    unmount();
    expect(connections[0]?.stopped).toBe(true);
  });

  it('연결마다 BFF에서 연결용 토큰을 받아 쓴다', async () => {
    fetchWsToken.mockResolvedValue({ token: 'ws-1', expiresAt: '2026-11-15T10:00:30Z' });
    render();

    await expect(connections[0]?.options.getToken()).resolves.toBe('ws-1');
    expect(fetchWsToken).toHaveBeenCalledTimes(1);
  });

  it('다시 연결을 맺는 중에만 끊김으로 보고, 연결될 때마다 최신 상세를 다시 받는다', () => {
    const { result, invalidate } = render();

    emit('connecting');
    expect(result.current.down).toBe(false);
    act(() => connections[0]?.options.onConnected?.(false));
    emit('connected');
    expect(invalidate).toHaveBeenCalledTimes(1);

    emit('reconnecting');
    expect(result.current.down).toBe(true);
    act(() => connections[0]?.options.onConnected?.(true));
    emit('connected');

    expect(result.current.down).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bundleKeys.detail('1', '2') });
  });

  it('「재시도」는 기다리지 않고 지금 다시 연결하게 한다', () => {
    const { result } = render();

    act(() => result.current.retry());

    expect(connections[0]?.retried).toBe(1);
  });
});

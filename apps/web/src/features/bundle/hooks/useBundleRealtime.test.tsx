import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeStatus, StompConnectionOptions } from '@/shared/realtime/stompConnection';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bundleKeys } from '../queries/keys';
import { type BundleRealtimeHandlers, useBundleRealtime } from './useBundleRealtime';

const connections = vi.hoisted(() => [] as FakeConnection[]);

type FakeConnection = {
  options: StompConnectionOptions;
  subscribed: string[];
  handlers: Map<string, (_body: unknown) => void>;
  published: { destination: string; body: unknown }[];
  started: boolean;
  stopped: boolean;
  retried: number;
};

vi.mock('@/shared/realtime/stompConnection', () => ({
  createStompConnection: (options: StompConnectionOptions) => {
    const fake: FakeConnection = {
      options,
      subscribed: [],
      handlers: new Map(),
      published: [],
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
      subscribe: (destination: string, handler: (_body: unknown) => void) => {
        fake.subscribed.push(destination);
        fake.handlers.set(destination, handler);
        return () => undefined;
      },
      publish: (destination: string, body: unknown) => {
        fake.published.push({ destination, body });
        return true;
      },
      status: () => 'idle',
    };
  },
}));

const fetchWsToken = vi.hoisted(() => vi.fn());
vi.mock('@/shared/realtime/wsToken', () => ({ fetchWsToken }));

const render = (active = true, handlers?: BundleRealtimeHandlers) => {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'refetchQueries');
  const hook = renderHook(() => useBundleRealtime('1', '2', active, handlers), {
    wrapper: createQueryWrapper(client),
  });
  return { ...hook, invalidate, client };
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

  it('다시 연결을 맺는 중에만 끊김으로 보고, 연결될 때마다 최신 상세를 다시 받는다', async () => {
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

    await waitFor(() => expect(result.current.down).toBe(false));
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(
      { queryKey: bundleKeys.detail('1', '2'), exact: true },
      { throwOnError: true },
    );
  });

  it('「재시도」는 기다리지 않고 지금 다시 연결하게 한다', () => {
    const { result } = render();

    act(() => result.current.retry());

    expect(connections[0]?.retried).toBe(1);
  });

  it('재연결 뒤에는 최신 상세를 다 받을 때까지 끊김으로 둔다', async () => {
    let finish: () => void = () => undefined;
    const { result, invalidate } = render();
    invalidate.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));

    emit('connecting');
    act(() => connections[0]?.options.onConnected?.(false));
    emit('connected');
    expect(result.current.down).toBe(false);

    emit('reconnecting');
    act(() => connections[0]?.options.onConnected?.(true));
    emit('connected');
    expect(result.current.down).toBe(true);

    act(() => finish());
    await waitFor(() => expect(result.current.down).toBe(false));
    expect(result.current.down).toBe(false);
  });

  it('재연결 뒤 최신 상세를 받지 못하면 끊김으로 두고 「재시도」가 상세를 다시 받는다', async () => {
    const { result, invalidate } = render();
    invalidate.mockRejectedValueOnce(new Error('network'));

    emit('reconnecting');
    act(() => connections[0]?.options.onConnected?.(true));
    emit('connected');
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.down).toBe(true));

    invalidate.mockResolvedValueOnce(undefined);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.down).toBe(false));
    expect(invalidate).toHaveBeenCalledTimes(2);
    // 연결을 맺는 쪽에는 항상 알리고(이미 연결돼 있으면 연결 쪽이 아무것도 하지 않음) 상세도 다시 받음
    expect(connections[0]?.retried).toBe(1);
  });

  it('처음 연결 뒤 상세를 받지 못해도 끊김으로 보지 않는다', async () => {
    const { result, invalidate } = render();
    invalidate.mockRejectedValueOnce(new Error('network'));

    act(() => connections[0]?.options.onConnected?.(false));
    emit('connected');
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));

    expect(result.current.down).toBe(false);
  });

  describe('저장 이벤트', () => {
    const detail = { status: 'DRAFT', revision: 5, date: null, dateVersion: 0, dateChips: [] };
    const setup = (holdEvent: (_type: string) => boolean) => {
      const { client } = render(true, { holdEvent });
      client.setQueryData(bundleKeys.detail('1', '2'), detail);
      return {
        client,
        topic: connections[0]!.handlers.get('/topic/bunches/1/bundles/2')!,
        current: () => client.getQueryData<typeof detail>(bundleKeys.detail('1', '2')),
      };
    };

    it('저장 이벤트는 상세 캐시에 반영한다', () => {
      const { topic, current } = setup(() => false);

      act(() =>
        topic({
          type: 'DATE',
          revision: 6,
          data: { value: '2026-11-12', version: 1, dateChips: [] },
        }),
      );

      expect(current()).toMatchObject({ date: '2026-11-12', revision: 6 });
    });

    it('적용을 미루겠다고 한 type의 이벤트는 건너뛰고 다른 type은 그대로 적용한다', () => {
      const { topic, current } = setup((type) => type === 'DATE');

      act(() =>
        topic({
          type: 'DATE',
          revision: 6,
          data: { value: '2026-11-12', version: 1, dateChips: [] },
        }),
      );

      expect(current()).toMatchObject({ date: null, revision: 5 });
    });
  });

  describe('presence', () => {
    const presence = {
      type: 'PRESENCE',
      revision: null,
      requestId: null,
      data: {
        members: [{ memberId: 12, expiresAt: '2026-11-13T12:00:15Z' }],
        typing: [],
        editing: [],
      },
    };

    it('topic과 내 연결의 activity queue로 온 PRESENCE를 모두 전달하고 다른 이벤트는 넘기지 않는다', () => {
      const onPresence = vi.fn();
      render(true, { onPresence });
      const [topic, activity] = [
        connections[0]!.handlers.get('/topic/bunches/1/bundles/2')!,
        connections[0]!.handlers.get('/user/queue/bundle-activity')!,
      ];

      topic(presence);
      activity(presence);
      topic({ type: 'DATE', revision: 3, data: {} });
      activity('garbage');

      expect(onPresence).toHaveBeenCalledTimes(2);
      expect(onPresence).toHaveBeenCalledWith(presence.data);
    });

    it('연결(재연결)되면 놓친 presence를 읽도록 알린다', () => {
      const onConnected = vi.fn();
      render(true, { onConnected });

      act(() => connections[0]?.options.onConnected?.(false));
      act(() => connections[0]?.options.onConnected?.(true));

      expect(onConnected).toHaveBeenCalledTimes(2);
    });

    it('presence 명령은 번들의 presence destination으로 보낸다', () => {
      const { result } = render();

      act(() => void result.current.sendPresence({ action: 'VIEW' }));

      expect(connections[0]?.published).toEqual([
        { destination: '/app/bunches/1/bundles/2/presence', body: { action: 'VIEW' } },
      ]);
    });

    it('화면을 나가면 연결을 닫기 전에 LEAVE를 보낸다', () => {
      const { unmount } = render();

      unmount();

      expect(connections[0]?.published).toEqual([
        { destination: '/app/bunches/1/bundles/2/presence', body: { action: 'LEAVE' } },
      ]);
      expect(connections[0]?.stopped).toBe(true);
    });
  });
});

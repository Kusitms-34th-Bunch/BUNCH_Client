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
  resumed: number;
  refreshed: number;
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
      resumed: 0,
      refreshed: 0,
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
      resume: () => {
        fake.resumed += 1;
      },
      refresh: () => {
        fake.refreshed += 1;
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

const captureException = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException }));

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
  captureException.mockReset();
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

  it('isDown()은 렌더를 기다리지 않고 연결이 끊긴 그 순간부터 true다', () => {
    const { result } = render();
    emit('connecting');
    emit('connected');
    expect(result.current.isDown()).toBe(false);

    act(() => {
      connections.at(-1)?.options.onStatus?.('reconnecting');
      // 같은 act 안(아직 다시 그려지기 전)에서도 바로 읽힘, down 값은 다시 그려져야 바뀜
      expect(result.current.isDown()).toBe(true);
      expect(result.current.down).toBe(false);
    });

    expect(result.current.down).toBe(true);
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

  describe('실패 보고', () => {
    const fail = (kind: string, error?: unknown) =>
      act(() => connections.at(-1)?.options.onError?.(kind as never, error));

    it('STOMP ERROR는 고정 문구로 10분에 한 번만 보고한다(다시 연결돼도 그 안에는 다시 보내지 않음)', () => {
      vi.useFakeTimers();
      render();
      fail('stomp');
      fail('stomp');
      expect(captureException).toHaveBeenCalledTimes(1);
      const [error, context] = captureException.mock.calls[0] as [Error, unknown];
      expect(error.message).toBe('Realtime stomp');
      expect(context).toEqual({ fingerprint: ['realtime', 'stomp'] });

      act(() => connections.at(-1)?.options.onConnected?.(true));
      fail('stomp');
      expect(captureException).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10 * 60_000);
      fail('stomp');
      expect(captureException).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('토큰 발급은 5xx만 보고하고 세션 만료(401)는 보고하지 않는다', async () => {
      const { ApiError } = await import('@app/api-core');
      render();
      fail('token', new ApiError({ message: 'unauthorized', category: 'auth', status: 401 }));
      expect(captureException).not.toHaveBeenCalled();

      fail('token', new ApiError({ message: 'raw body', category: 'server', status: 503 }));
      expect(captureException).toHaveBeenCalledTimes(1);
      const [error] = captureException.mock.calls[0] as [Error];
      expect(error.message).not.toContain('raw body');
    });

    it('구독 처리 함수의 예외는 원래 오류로 보고한다', () => {
      render();
      const failure = new Error('handler failed');
      fail('handler', failure);
      expect(captureException).toHaveBeenCalledWith(failure, {
        fingerprint: ['realtime', 'handler'],
      });
    });
  });

  describe('복귀 재연결', () => {
    const setVisibility = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
    };
    afterEach(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      vi.useRealTimers();
    });

    it('네트워크가 돌아오면 재연결 대기를 기다리지 않게 한다', () => {
      render();
      act(() => void window.dispatchEvent(new Event('online')));
      expect(connections[0]?.resumed).toBe(1);
    });

    it('잠깐 숨겼다 돌아오면 이어 붙이기만 하고, 30초 넘게 숨겼다 돌아오면 새 연결로 갈아 끼운다', () => {
      vi.useFakeTimers();
      render();
      setVisibility('hidden');
      vi.advanceTimersByTime(29_000);
      setVisibility('visible');
      expect(connections[0]).toMatchObject({ resumed: 1, refreshed: 0 });

      setVisibility('hidden');
      vi.advanceTimersByTime(30_000);
      setVisibility('visible');
      expect(connections[0]).toMatchObject({ resumed: 2, refreshed: 1 });
    });

    it('받지 못한 상세가 남은 채 연결을 갈아 끼우면 다시 받을 때까지 끊김으로 둔다', async () => {
      const { result, invalidate } = render();
      emit('connected');
      emit('reconnecting');
      invalidate.mockRejectedValueOnce(new Error('offline'));
      emit('connected');
      act(() => connections.at(-1)?.options.onConnected?.(true));
      await waitFor(() => expect(result.current.down).toBe(true));

      // 갈아 끼운 연결이 붙었지만 이번 재조회도 실패
      invalidate.mockRejectedValueOnce(new Error('offline'));
      act(() => connections.at(-1)?.options.onConnected?.(false));
      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
      expect(result.current.down).toBe(true);
    });

    it('화면을 떠나면 더 이상 복귀 이벤트에 반응하지 않는다', () => {
      const { unmount } = render();
      unmount();
      act(() => void window.dispatchEvent(new Event('online')));
      expect(connections[0]?.resumed).toBe(0);
    });
  });
});

import type { IFrame } from '@stomp/stompjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStompConnection, type RealtimeStatus } from './stompConnection';

type Config = {
  brokerURL?: string;
  connectHeaders?: Record<string, string>;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
  onConnect?: (_frame: IFrame) => void;
  onStompError?: (_frame: IFrame) => void;
  onWebSocketClose?: (_event: unknown) => void;
};

class FakeClient {
  static instances: FakeClient[] = [];
  activated = false;
  deactivated = false;
  subscriptions = new Map<string, (_message: { body: string }) => void>();
  published: { destination: string; body?: string }[] = [];

  readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    FakeClient.instances.push(this);
  }

  activate() {
    this.activated = true;
  }

  deactivate() {
    this.deactivated = true;
    return Promise.resolve();
  }

  subscribe(destination: string, callback: (_message: { body: string }) => void) {
    this.subscriptions.set(destination, callback);
    return { id: destination, unsubscribe: () => this.subscriptions.delete(destination) };
  }

  publish(parameters: { destination: string; body?: string }) {
    this.published.push(parameters);
  }

  // 서버가 CONNECTED를 보냄
  connect() {
    this.config.onConnect?.({} as IFrame);
  }

  // 연결이 끊김
  drop() {
    this.config.onWebSocketClose?.({});
  }

  receive(destination: string, body: string) {
    this.subscriptions.get(destination)?.({ body });
  }
}

const TOPIC = '/topic/bunches/1/bundles/2';
const last = () => FakeClient.instances.at(-1)!;

const setup = (getToken = vi.fn(() => Promise.resolve('token-1'))) => {
  const statuses: RealtimeStatus[] = [];
  const onConnected = vi.fn();
  const connection = createStompConnection({
    url: 'wss://api.example.com/ws',
    getToken,
    onStatus: (status) => statuses.push(status),
    onConnected,
    createClient: (config) => new FakeClient(config as Config) as never,
  });
  return { connection, statuses, onConnected, getToken };
};

// 토큰 요청(Promise)이 끝나도록 마이크로태스크를 비움
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  FakeClient.instances = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createStompConnection', () => {
  it('연결할 때 토큰을 새로 받아 CONNECT 헤더에만 싣고 heart-beat와 자동 재연결은 쓰지 않는다', async () => {
    const { connection, statuses, onConnected } = setup();

    connection.start();
    await flush();

    expect(last().config).toMatchObject({
      brokerURL: 'wss://api.example.com/ws',
      connectHeaders: { Authorization: 'Bearer token-1' },
      reconnectDelay: 0,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      connectionTimeout: 10_000,
    });
    // 주소에는 query가 없어야 함(서버는 query가 있으면 연결을 거절)
    expect(last().config.brokerURL).not.toContain('?');
    expect(last().activated).toBe(true);
    expect(statuses).toEqual(['connecting']);

    last().connect();
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(onConnected).toHaveBeenCalledWith(false);
  });

  it('구독은 연결되면 맺고 메시지를 JSON으로 풀어 전달한다', async () => {
    const { connection } = setup();
    const received: unknown[] = [];
    connection.subscribe(TOPIC, (body) => received.push(body));
    connection.start();
    await flush();
    expect(last().subscriptions.size).toBe(0);

    last().connect();
    last().receive(TOPIC, '{"type":"TITLE","revision":3}');
    last().receive(TOPIC, 'not json');

    expect(received).toEqual([{ type: 'TITLE', revision: 3 }, undefined]);
  });

  it('같은 destination의 구독자는 STOMP 구독 하나를 나눠 쓰고 모두 해제하면 구독을 끊는다', async () => {
    const { connection } = setup();
    connection.start();
    await flush();
    last().connect();
    const a: unknown[] = [];
    const b: unknown[] = [];
    const offA = connection.subscribe(TOPIC, (body) => a.push(body));
    const offB = connection.subscribe(TOPIC, (body) => b.push(body));

    last().receive(TOPIC, '1');
    offA();
    last().receive(TOPIC, '2');
    expect(a).toEqual([1]);
    expect(b).toEqual([1, 2]);

    offB();
    expect(last().subscriptions.has(TOPIC)).toBe(false);
  });

  it('끊기면 대기 뒤 토큰을 다시 받아 새 연결로 맺고 구독을 다시 맺으며 재연결을 알린다', async () => {
    const getToken = vi.fn().mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');
    const { connection, statuses, onConnected } = setup(getToken);
    const received: unknown[] = [];
    connection.subscribe(TOPIC, (body) => received.push(body));
    connection.start();
    await flush();
    const first = last();
    first.connect();

    first.drop();
    expect(statuses.at(-1)).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1_000);

    const second = last();
    expect(second).not.toBe(first);
    expect(first.deactivated).toBe(true);
    expect(second.config.connectHeaders).toEqual({ Authorization: 'Bearer token-2' });
    second.connect();
    second.receive(TOPIC, '{"ok":true}');

    expect(statuses.at(-1)).toBe('connected');
    expect(onConnected).toHaveBeenLastCalledWith(true);
    expect(received).toEqual([{ ok: true }]);
  });

  it('재연결 대기는 실패가 이어질수록 길어지고 연결이 안정적으로 이어지면 처음으로 돌아간다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();
    last().drop();

    await vi.advanceTimersByTimeAsync(999);
    expect(getToken).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(getToken).toHaveBeenCalledTimes(2);

    last().drop();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(getToken).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(getToken).toHaveBeenCalledTimes(3);

    last().connect();
    await vi.advanceTimersByTimeAsync(10_000);
    last().drop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(getToken).toHaveBeenCalledTimes(4);
  });

  it('붙자마자 끊기는 연결은 대기를 처음으로 되돌리지 않는다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();
    last().drop();
    await vi.advanceTimersByTimeAsync(1_000);
    last().connect();
    last().drop();

    await vi.advanceTimersByTimeAsync(1_999);
    expect(getToken).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(getToken).toHaveBeenCalledTimes(3);
  });

  it('오류와 닫힘이 연달아 와도 다음 연결은 한 번만 예약한다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();

    last().config.onStompError?.({} as IFrame);
    last().drop();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('토큰을 받지 못하면 연결하지 않고 같은 규칙으로 다시 시도한다', async () => {
    const getToken = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('token-2');
    const { connection, statuses } = setup(getToken);

    connection.start();
    await flush();
    expect(FakeClient.instances).toHaveLength(0);
    // 처음 연결을 맺기 전의 실패는 끊김이 아님
    expect(statuses.at(-1)).toBe('connecting');

    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeClient.instances).toHaveLength(1);
  });

  it('세션이 끝나 토큰을 못 받으면(401) 다시 시도하지 않고 닫되 「재시도」는 할 수 있다', async () => {
    const getToken = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { status: 401 }))
      .mockResolvedValueOnce('token-2');
    const { connection, statuses } = setup(getToken);

    connection.start();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe('closed');

    connection.retryNow();
    await flush();
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(FakeClient.instances).toHaveLength(1);
  });

  it('연결돼 있을 때만 보내고 끊겨 있으면 보내지 않는다', async () => {
    const { connection } = setup();
    connection.start();
    await flush();
    expect(connection.publish('/app/x', { action: 'VIEW' })).toBe(false);

    last().connect();
    expect(connection.publish('/app/x', { action: 'VIEW' })).toBe(true);
    expect(last().published).toEqual([{ destination: '/app/x', body: '{"action":"VIEW"}' }]);

    last().drop();
    expect(connection.publish('/app/x', { action: 'VIEW' })).toBe(false);
  });

  it('멈추면 연결을 닫고 다시 연결하지 않는다', async () => {
    const { connection, statuses, getToken } = setup();
    connection.start();
    await flush();
    const only = last();
    only.connect();

    connection.stop();
    only.drop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(only.deactivated).toBe(true);
    expect(statuses.at(-1)).toBe('closed');
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('「재시도」는 기다리지 않고 지금 다시 연결한다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();
    last().drop();

    connection.retryNow();
    await flush();

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(FakeClient.instances).toHaveLength(2);
  });

  it('이미 연결돼 있으면 「재시도」는 아무것도 하지 않는다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();
    last().connect();

    connection.retryNow();
    await flush();

    expect(getToken).toHaveBeenCalledTimes(1);
  });
});

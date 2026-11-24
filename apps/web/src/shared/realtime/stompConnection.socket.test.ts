import { Client } from '@stomp/stompjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStompConnection } from './stompConnection';

// 브라우저 WebSocket 대신 쓰는 가짜 소켓: 서버 응답은 테스트가 직접 넣고, close()를 불러도 닫힘 이벤트는 브라우저처럼 늦게 오지 않음
class FakeSocket {
  url = 'wss://api.example.com/ws';
  readyState = 0;
  sent: string[] = [];
  closed = false;
  onopen: ((_event?: unknown) => unknown) | null = null;
  onclose: ((_event?: unknown) => unknown) | null = null;
  onerror: ((_event: unknown) => unknown) | null = null;
  onmessage: ((_event: { data: string }) => unknown) | null = null;

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(frame: string) {
    this.onmessage?.({ data: frame });
  }
}

const CONNECTED = 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0';
let sockets: FakeSocket[] = [];
const socket = (index: number) => sockets[index]!;

const setup = () => {
  const getToken = vi.fn(() => Promise.resolve('token-1'));
  const statuses: string[] = [];
  const onConnected = vi.fn();
  const connection = createStompConnection({
    url: 'wss://api.example.com/ws',
    getToken,
    onStatus: (status) => statuses.push(status),
    onConnected,
    random: () => 0.5,
    createClient: (config) =>
      new Client({
        ...config,
        webSocketFactory: () => {
          const socket = new FakeSocket();
          sockets.push(socket);
          return socket;
        },
      }),
  });
  return { connection, getToken, statuses, onConnected };
};

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
});
afterEach(() => vi.useRealTimers());

describe('createStompConnection(실제 stompjs Client)', () => {
  it('토큰은 CONNECT frame에만 싣고 heart-beat는 0,0으로 요청한다', async () => {
    const { connection } = setup();
    connection.start();
    await flush();
    socket(0).open();

    const [connect] = socket(0).sent;
    expect(connect).toMatch(/^CONNECT\n/);
    expect(connect).toContain('Authorization:Bearer token-1');
    expect(connect).toContain('heart-beat:0,0');
    expect(socket(0).url).not.toContain('token');
    connection.stop();
  });

  it('서버가 RECEIPT를 주지 않아도 멈추면 소켓을 바로 닫고, 먼저 보낸 LEAVE는 닫기 전에 나간다', async () => {
    const { connection } = setup();
    connection.start();
    await flush();
    socket(0).open();
    socket(0).receive(CONNECTED);
    expect(connection.status()).toBe('connected');

    connection.publish('/app/presence', { action: 'LEAVE' });
    connection.stop();

    expect(socket(0).sent.at(-1)).toContain('{"action":"LEAVE"}');
    expect(socket(0).closed).toBe(true);
    expect(connection.status()).toBe('closed');
  });

  it('CONNECTED가 10초 안에 오지 않으면 소켓 닫힘을 기다리지 않고 다음 연결을 예약한다', async () => {
    const { connection, getToken } = setup();
    connection.start();
    await flush();
    socket(0).open();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(socket(0).closed).toBe(true);
    expect(connection.status()).toBe('connecting');

    // 첫 재연결 대기(1초) 뒤 토큰을 다시 받아 새 소켓으로 연결
    await vi.advanceTimersByTimeAsync(1_000);
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);
    connection.stop();
  });

  it('refresh()는 강제로 닫은 옛 소켓의 닫힘을 끊김으로 보지 않고 「연결됨」인 채 새 소켓으로 갈아 끼운다', async () => {
    const { connection, statuses, onConnected } = setup();
    connection.start();
    await flush();
    socket(0).open();
    socket(0).receive(CONNECTED);

    connection.refresh();
    expect(socket(0).closed).toBe(true);
    await flush();
    socket(1).open();
    socket(1).receive(CONNECTED);

    expect(statuses).toEqual(['connecting', 'connected']);
    expect(onConnected).toHaveBeenLastCalledWith(false);
    connection.stop();
  });

  it('갈아 끼우는 중 새 소켓이 CONNECTED를 받기 전에는 보내지 않고, 받은 뒤에는 보내며, 멈추면 새 소켓을 닫는다', async () => {
    const { connection } = setup();
    connection.start();
    await flush();
    socket(0).open();
    socket(0).receive(CONNECTED);

    connection.refresh();
    await flush();
    socket(1).open();
    // 토큰은 받았지만 STOMP 세션은 아직 없음(상태는 「연결됨」 유지)
    expect(connection.status()).toBe('connected');
    expect(connection.publish('/app/presence', { action: 'VIEW' })).toBe(false);
    // 새 세션이 맺어지면 다시 보냄
    socket(1).receive(CONNECTED);
    expect(connection.publish('/app/presence', { action: 'VIEW' })).toBe(true);

    connection.publish('/app/presence', { action: 'LEAVE' });
    connection.stop();
    expect(socket(1).closed).toBe(true);
  });
});

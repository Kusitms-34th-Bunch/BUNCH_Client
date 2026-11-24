import { Client, type IFrame, type IMessage } from '@stomp/stompjs';
import { apiErrorStatus } from '../api/client/errorStatus';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

type StompClient = Pick<Client, 'activate' | 'deactivate' | 'subscribe' | 'publish'>;
type StompClientConfig = ConstructorParameters<typeof Client>[0];

export type StompConnectionOptions = {
  /** `wss://…/ws`(query 없음) */
  url: string;
  /** 연결할 때마다 새로 받는 연결용 토큰(CONNECT의 `Authorization`에만 실음) */
  getToken: () => Promise<string>;
  /** 연결 상태가 바뀔 때 */
  onStatus?: (_status: RealtimeStatus) => void;
  /** 연결이 맺어졌을 때. 재연결이면 true(끊긴 사이 놓친 변경을 다시 받을 때 씀) */
  onConnected?: (_reconnected: boolean) => void;
  /** 테스트에서 가짜 클라이언트를 넣기 위한 자리 */
  createClient?: (_config: StompClientConfig) => StompClient;
};

export type StompConnection = {
  /** 연결을 시작함(이미 시작했으면 무시) */
  start: () => void;
  /** 연결을 닫고 다시 연결하지 않음 */
  stop: () => void;
  /** 끊긴 상태에서 기다리지 않고 지금 다시 연결함(「재시도」) */
  retryNow: () => void;
  /** destination 구독(같은 destination의 구독자는 한 STOMP 구독을 나눠 씀). 반환한 함수로 해제 */
  subscribe: (_destination: string, _handler: (_body: unknown) => void) => () => void;
  /** 연결돼 있을 때만 보냄. 끊겨 있으면 보내지 않고 false(끊긴 사이의 수정은 버림) */
  publish: (_destination: string, _body: unknown) => boolean;
  status: () => RealtimeStatus;
};

/** 연결이 이만큼 이어져야 안정적으로 보고 재연결 대기를 처음으로 되돌림(붙었다 바로 끊기는 연결이 대기 없이 반복되지 않게 함) */
const STABLE_AFTER_MS = 10_000;
/** CONNECTED가 이 시간 안에 오지 않으면 실패로 봄(서버가 frame을 조용히 버리는 경우 대비) */
const CONNECT_TIMEOUT_MS = 10_000;

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000] as const;

const parseBody = (message: IMessage): unknown => {
  try {
    return JSON.parse(message.body);
  } catch {
    return undefined;
  }
};

/**
 * STOMP 연결 하나를 관리: 연결마다 토큰을 새로 받아 CONNECT 헤더로 보내고, 끊기면 새 연결로 다시 맺음
 * 주의: stompjs의 `debug` 로그를 켜면 CONNECT frame의 토큰이 콘솔에 남으므로 켜지 않음
 * 서버 규칙(v5 실시간 명세): 네이티브 WebSocket `/ws`, CONNECT의 `Authorization: Bearer`만 인증에 쓰고 이후 frame에는 싣지 않음,
 * heart-beat는 쓰지 않음(`0,0`), 재연결은 새 연결이라 구독을 다시 맺음. 끊긴 사이의 이벤트는 재생되지 않아 다시 받는 일은 호출하는 쪽이 함
 */
export const createStompConnection = ({
  url,
  getToken,
  onStatus,
  onConnected,
  createClient = (config) => new Client(config),
}: StompConnectionOptions): StompConnection => {
  let status: RealtimeStatus = 'idle';
  let client: StompClient | undefined;
  let stopped = true;
  let everConnected = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  // 이 값이 바뀌면 낡은 연결 시도의 늦은 콜백을 무시함
  let generation = 0;
  const handlers = new Map<string, Set<(_body: unknown) => void>>();
  const active = new Map<string, { unsubscribe: () => void }>();

  const setStatus = (next: RealtimeStatus) => {
    if (status === next) return;
    status = next;
    onStatus?.(next);
  };

  const attachSubscription = (destination: string) => {
    if (!client || active.has(destination)) return;
    const subscription = client.subscribe(destination, (message) => {
      const body = parseBody(message);
      handlers.get(destination)?.forEach((handler) => handler(body));
    });
    active.set(destination, subscription);
  };

  const scheduleReconnect = () => {
    // 연결이 10초 넘게 이어지지 못했으면 재연결 대기를 되돌리지 않음(다음 토큰 요청이 늦어져도 이전 타이머가 attempt를 비우지 않게)
    clearTimeout(stableTimer);
    stableTimer = undefined;
    // 오류와 닫힘이 연달아 와도 다음 연결은 한 번만 예약함
    if (stopped || reconnectTimer !== undefined) return;
    // 처음 연결을 맺기 전의 실패는 「끊김」이 아니라 계속 「연결 중」으로 둠(실시간 서버 문제가 저장·업로드를 막지 않게 함)
    setStatus(everConnected ? 'reconnecting' : 'connecting');
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  const dropClient = () => {
    clearTimeout(stableTimer);
    stableTimer = undefined;
    active.clear();
    const current = client;
    client = undefined;
    void current?.deactivate();
  };

  function connect() {
    if (stopped) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    const mine = ++generation;
    // 처음 연결을 재시도하는 중에도 「연결 중」과 「재연결 중」이 번갈아 보이지 않게 함
    setStatus(everConnected ? 'reconnecting' : 'connecting');
    getToken().then(
      (token) => {
        if (stopped || mine !== generation) return;
        // 한 번 끊긴 연결은 버리고 새 Client로 맺음(재연결은 새 연결)
        dropClient();
        const next = createClient({
          brokerURL: url,
          connectHeaders: { Authorization: `Bearer ${token}` },
          // 자동 재연결은 쓰지 않고(연결마다 토큰을 새로 받아야 함) heart-beat는 쓰지 않음
          reconnectDelay: 0,
          connectionTimeout: CONNECT_TIMEOUT_MS,
          heartbeatIncoming: 0,
          heartbeatOutgoing: 0,
          onConnect: () => {
            if (stopped || mine !== generation) return;
            const reconnected = everConnected;
            everConnected = true;
            clearTimeout(stableTimer);
            stableTimer = setTimeout(() => {
              attempt = 0;
            }, STABLE_AFTER_MS);
            setStatus('connected');
            handlers.forEach((_set, destination) => attachSubscription(destination));
            onConnected?.(reconnected);
          },
          onStompError: (_frame: IFrame) => {
            if (mine === generation) scheduleReconnect();
          },
          onWebSocketClose: () => {
            if (mine === generation) scheduleReconnect();
          },
        });
        client = next;
        next.activate();
      },
      (error: unknown) => {
        if (mine !== generation) return;
        // 세션이 끝났으면(401·403) 다시 시도해도 같으므로 멈춤. 「재시도」로는 다시 해 볼 수 있음
        const status = apiErrorStatus(error);
        if (status === 401 || status === 403) {
          // 한 번 연결됐던 세션이면 끊김으로 남겨 편집을 계속 막고, 처음 연결 전이면 닫기만 함
          setStatus(everConnected ? 'reconnecting' : 'closed');
          return;
        }
        // 네트워크 등 일시 오류: 같은 규칙으로 다시 시도
        scheduleReconnect();
      },
    );
  }

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      connect();
    },
    stop: () => {
      stopped = true;
      generation += 1;
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      dropClient();
      setStatus('closed');
    },
    retryNow: () => {
      if (stopped || status === 'connected') return;
      attempt = 0;
      connect();
    },
    subscribe: (destination, handler) => {
      const set = handlers.get(destination) ?? new Set();
      set.add(handler);
      handlers.set(destination, set);
      if (status === 'connected') attachSubscription(destination);
      let released = false;
      return () => {
        // 같은 해제 함수를 다시 불러도 나중에 등록된 구독자를 지우지 않음
        if (released) return;
        released = true;
        set.delete(handler);
        if (set.size > 0) return;
        handlers.delete(destination);
        try {
          active.get(destination)?.unsubscribe();
        } catch {
          // 이미 끊긴 연결의 구독 해제는 실패해도 무시(다음 연결에서 새로 맺음)
        }
        active.delete(destination);
      };
    },
    publish: (destination, body) => {
      if (status !== 'connected' || !client) return false;
      client.publish({ destination, body: JSON.stringify(body) });
      return true;
    },
    status: () => status,
  };
};

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isRealtimeEnabled, realtimeUrl } from '@/shared/realtime/config';
import {
  createStompConnection,
  type RealtimeStatus,
  type StompConnection,
} from '@/shared/realtime/stompConnection';
import { fetchWsToken } from '@/shared/realtime/wsToken';
import { type PresenceData, presenceEventSchema } from '../lib/presence';
import { bundleEventEnvelopeSchema } from '../model/bundle';
import { useApplyBundleEvent, useRefetchBundleDetail } from '../queries/bundles';

/** 번들 초안의 STOMP destination(v5 실시간 명세) */
export const bundleDestinations = (bunchId: string, bundleId: string) => ({
  /** 저장 이벤트와 전체 presence */
  topic: `/topic/bunches/${bunchId}/bundles/${bundleId}`,
  /** 내가 보낸 명령에 대한 presence 응답 */
  activity: '/user/queue/bundle-activity',
  /** 명령 거절 등 개인 응답 */
  leases: '/user/queue/bundle-leases',
  /** presence·작업 신호를 보냄 */
  presence: `/app/bunches/${bunchId}/bundles/${bundleId}/presence`,
});

export type BundleRealtime = {
  /** 실시간 연결을 쓰는 중인지(가짜 서버 모드·주소 미설정이면 false) */
  enabled: boolean;
  status: RealtimeStatus;
  /** 연결이 끊겼거나, 다시 연결된 뒤 최신 상세를 받는 중·받지 못한 상태: 편집을 막아야 함(처음 연결을 맺기 전은 포함하지 않음) */
  down: boolean;
  /**
   * 지금 이 순간 `down`인지(렌더를 기다리지 않고 바로 읽음)
   * `down`은 상태가 바뀐 렌더 뒤에야 반영돼, 그 사이에 보내는 요청(대기열)은 이 함수로 확인함
   */
  isDown: () => boolean;
  /** 기다리지 않고 지금 다시 연결 */
  retry: () => void;
  /** presence 명령(VIEW·BEGIN·TYPE 등)을 보냄. 연결돼 있지 않으면 보내지 않고 false */
  sendPresence: (_body: Record<string, unknown>) => boolean;
};

export type BundleRealtimeHandlers = {
  /** 전체 PRESENCE를 받았을 때(topic·내 연결의 activity queue 모두). 세 배열을 통째로 교체하면 됨 */
  onPresence?: (_data: PresenceData) => void;
  /** 내 변경 요청이 진행 중이라 그 type의 저장 이벤트를 지금 적용하지 않으려 할 때 true(요청 응답이 그 시점의 최신 목록이라 이벤트로 덮지 않음) */
  holdEvent?: (_type: string) => boolean;
  /** 연결(재연결 포함)이 맺어지고 구독을 마친 직후. 놓친 presence를 다시 읽을 때 씀 */
  onConnected?: () => void;
};

const DISABLED: BundleRealtime = {
  enabled: false,
  status: 'idle',
  down: false,
  isDown: () => false,
  retry: () => undefined,
  sendPresence: () => false,
};

/**
 * 번들 초안의 실시간 연결: 초안이 열려 있는 동안 STOMP로 연결하고 세 destination을 구독
 * 연결마다 BFF에서 연결용 토큰을 새로 받고, 끊겼다 다시 연결되면 놓친 변경을 최신 상세로 다시 받아 맞춤(이벤트는 재생되지 않음)
 * 가짜 서버 모드이거나 `NEXT_PUBLIC_WS_URL`이 없으면 연결하지 않고 저장 흐름만 동작함
 */
export function useBundleRealtime(
  bunchId: string | undefined,
  bundleId: string | undefined,
  active: boolean,
  handlers?: BundleRealtimeHandlers,
): BundleRealtime {
  // 연결 effect가 최신 처리 함수를 부르되 다시 연결하지는 않게 ref에 둠
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  const refetchDetail = useRefetchBundleDetail(bunchId, bundleId);
  // 연결 effect가 최신 함수를 부르되 다시 연결하지는 않게 ref에 둠
  const refetchRef = useRef(refetchDetail);
  useEffect(() => {
    refetchRef.current = refetchDetail;
  });
  const applyEvent = useApplyBundleEvent(bunchId, bundleId);
  const applyEventRef = useRef(applyEvent);
  useEffect(() => {
    applyEventRef.current = applyEvent;
  });
  const [status, setStatusState] = useState<RealtimeStatus>('idle');
  // 연결 상태가 바뀌는 즉시 읽을 수 있게 상태와 함께 ref에도 바로 씀(렌더·effect를 기다리지 않음)
  const statusRef = useRef<RealtimeStatus>('idle');
  const setStatus = useCallback((next: RealtimeStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);
  // 재연결 뒤 최신 상세를 받는 중이거나 받지 못했을 때: 화면이 낡았을 수 있어 끊김과 같이 다룸
  const [sync, setSyncState] = useState<'idle' | 'syncing' | 'failed'>('idle');
  const syncRun = useRef(0);
  const syncRef = useRef(sync);
  const setSync = useCallback((next: 'idle' | 'syncing' | 'failed') => {
    syncRef.current = next;
    setSyncState(next);
  }, []);
  const connectionRef = useRef<StompConnection | undefined>(undefined);
  const enabled = active && bunchId !== undefined && bundleId !== undefined && isRealtimeEnabled();

  // 최신 상세를 다시 받음. track이면 끝날 때까지(실패하면 실패로) 끊김으로 둠. 더 새 요청이 있으면 낡은 결과는 무시
  const resync = useCallback(
    (track: boolean) => {
      const run = ++syncRun.current;
      if (track) setSync('syncing');
      refetchRef.current().then(
        () => {
          if (run === syncRun.current) setSync('idle');
        },
        () => {
          if (run === syncRun.current) setSync(track ? 'failed' : 'idle');
        },
      );
    },
    [setSync],
  );

  useEffect(() => {
    const url = realtimeUrl();
    if (!enabled || bunchId === undefined || bundleId === undefined || url === undefined) return;
    const applyPresence = (body: unknown) => {
      const parsed = presenceEventSchema.safeParse(body);
      if (parsed.success) handlersRef.current?.onPresence?.(parsed.data.data);
    };
    const connection = createStompConnection({
      url,
      getToken: async () => (await fetchWsToken()).token,
      onStatus: setStatus,
      onConnected: (reconnected) => {
        // 구독을 맺은 직후 최신 상세로 맞춤: 상세를 받은 뒤 구독 전까지, 또는 끊긴 사이의 변경은 이벤트로 오지 않음(삭제·발행·권한 변화도 이 결과로 처리됨)
        // 재연결이면 다 받을 때까지 편집을 막음
        resync(reconnected);
        handlersRef.current?.onConnected?.();
      },
    });
    connectionRef.current = connection;
    // 번들 topic의 저장 이벤트는 type별로 상세에 반영하거나 최신 상세를 다시 받음(useApplyBundleEvent). leases는 처리하지 않음
    const { topic, activity, leases } = bundleDestinations(bunchId, bundleId);
    const unsubscribers = [
      connection.subscribe(topic, (body) => {
        const envelope = bundleEventEnvelopeSchema.safeParse(body);
        const held =
          envelope.success && handlersRef.current?.holdEvent?.(envelope.data.type) === true;
        if (!held) applyEventRef.current(body);
        applyPresence(body);
      }),
      // 내가 보낸 명령에 대한 presence 응답(topic과 같은 내용)
      connection.subscribe(activity, applyPresence),
      connection.subscribe(leases, () => undefined),
    ];
    connection.start();
    return () => {
      // 화면을 나가거나 발행·삭제로 닫을 때는 연결을 닫기 전에 입장을 끝냄(서버의 끊김 유예를 기다리지 않음)
      connection.publish(bundleDestinations(bunchId, bundleId).presence, { action: 'LEAVE' });
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      connection.stop();
      connectionRef.current = undefined;
      syncRun.current += 1;
      setSync('idle');
    };
  }, [enabled, bunchId, bundleId, resync, setStatus, setSync]);

  const isDown = useCallback(
    () => statusRef.current === 'reconnecting' || syncRef.current !== 'idle',
    [],
  );

  // 최신 상세를 받지 못했으면 상세를 다시 받고, 끊겨 있으면 기다리지 않고 다시 연결
  const retry = useCallback(() => {
    if (syncRef.current === 'failed') resync(true);
    // 이미 연결돼 있으면 아무것도 하지 않음
    connectionRef.current?.retryNow();
  }, [resync]);

  const sendPresence = useCallback(
    (body: Record<string, unknown>) => {
      if (bunchId === undefined || bundleId === undefined) return false;
      return (
        connectionRef.current?.publish(bundleDestinations(bunchId, bundleId).presence, body) ??
        false
      );
    },
    [bunchId, bundleId],
  );

  if (!enabled) return DISABLED;
  return {
    enabled,
    status,
    down: status === 'reconnecting' || sync !== 'idle',
    isDown,
    retry,
    sendPresence,
  };
}

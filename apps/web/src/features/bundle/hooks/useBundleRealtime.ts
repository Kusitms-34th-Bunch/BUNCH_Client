'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isRealtimeEnabled, realtimeUrl } from '@/shared/realtime/config';
import {
  createStompConnection,
  type RealtimeStatus,
  type StompConnection,
} from '@/shared/realtime/stompConnection';
import { fetchWsToken } from '@/shared/realtime/wsToken';
import { useRefetchBundleDetail } from '../queries/bundles';

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
  /** 기다리지 않고 지금 다시 연결 */
  retry: () => void;
};

const DISABLED: BundleRealtime = {
  enabled: false,
  status: 'idle',
  down: false,
  retry: () => undefined,
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
): BundleRealtime {
  const refetchDetail = useRefetchBundleDetail(bunchId, bundleId);
  // 연결 effect가 최신 함수를 부르되 다시 연결하지는 않게 ref에 둠
  const refetchRef = useRef(refetchDetail);
  useEffect(() => {
    refetchRef.current = refetchDetail;
  });
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  // 재연결 뒤 최신 상세를 받는 중이거나 받지 못했을 때: 화면이 낡았을 수 있어 끊김과 같이 다룸
  const [sync, setSync] = useState<'idle' | 'syncing' | 'failed'>('idle');
  const syncRun = useRef(0);
  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  });
  const connectionRef = useRef<StompConnection | undefined>(undefined);
  const enabled = active && bunchId !== undefined && bundleId !== undefined && isRealtimeEnabled();

  // 최신 상세를 다시 받음. track이면 끝날 때까지(실패하면 실패로) 끊김으로 둠. 더 새 요청이 있으면 낡은 결과는 무시
  const resync = useCallback((track: boolean) => {
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
  }, []);

  useEffect(() => {
    const url = realtimeUrl();
    if (!enabled || bunchId === undefined || bundleId === undefined || url === undefined) return;
    const connection = createStompConnection({
      url,
      getToken: async () => (await fetchWsToken()).token,
      onStatus: setStatus,
      onConnected: (reconnected) => {
        // 구독을 맺은 직후 최신 상세로 맞춤: 상세를 받은 뒤 구독 전까지, 또는 끊긴 사이의 변경은 이벤트로 오지 않음(삭제·발행·권한 변화도 이 결과로 처리됨)
        // 재연결이면 다 받을 때까지 편집을 막음
        resync(reconnected);
      },
    });
    connectionRef.current = connection;
    // 이후 이슈가 destination별 처리를 붙이므로 지금은 연결·구독 상태만 만듦(받은 내용은 구독자가 있을 때 전달)
    const { topic, activity, leases } = bundleDestinations(bunchId, bundleId);
    const unsubscribers = [topic, activity, leases].map((destination) =>
      connection.subscribe(destination, () => undefined),
    );
    connection.start();
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      connection.stop();
      connectionRef.current = undefined;
      syncRun.current += 1;
      setSync('idle');
    };
  }, [enabled, bunchId, bundleId, resync]);

  // 최신 상세를 받지 못했으면 상세를 다시 받고, 끊겨 있으면 기다리지 않고 다시 연결
  const retry = useCallback(() => {
    if (syncRef.current === 'failed') resync(true);
    // 이미 연결돼 있으면 아무것도 하지 않음
    connectionRef.current?.retryNow();
  }, [resync]);

  if (!enabled) return DISABLED;
  return { enabled, status, down: status === 'reconnecting' || sync !== 'idle', retry };
}

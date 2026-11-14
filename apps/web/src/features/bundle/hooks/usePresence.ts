'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBundlePresence } from '../api/bundles';
import {
  activePresence,
  type DraftPresence,
  EMPTY_PRESENCE,
  nextExpiry,
  type PresenceData,
  toDraftPresence,
} from '../lib/presence';

export type PresenceState = {
  /** 만료된 항목을 뺀 화면용 presence */
  presence: DraftPresence;
  /** 받은 전체 PRESENCE로 세 배열을 통째로 교체(누적 병합 없음) */
  apply: (_data: PresenceData) => void;
  /** 현재 presence를 서버에서 다시 읽어 교체(재연결 복구용. 입장 신호가 아님) */
  refresh: () => void;
};

/**
 * 번들 presence 상태: 받은 값은 통째로 교체하고, 각 expiresAt이 지나면 서버 방송을 기다리지 않고 화면에서 뺌
 * 복구 조회가 끝나기 전에 더 새 PRESENCE가 도착했으면 낡은 조회 결과로 덮지 않음
 */
export function usePresence(
  bunchId: string | undefined,
  bundleId: string | undefined,
): PresenceState {
  const [data, setData] = useState<PresenceData>(EMPTY_PRESENCE);
  // 만료를 다시 계산하는 시각(렌더 중에 시계를 읽지 않으려고 상태로 둠)
  const [now, setNow] = useState(0);
  const received = useRef(0);

  const replace = useCallback((next: PresenceData) => {
    setData(next);
    setNow(Date.now());
  }, []);

  const apply = useCallback(
    (next: PresenceData) => {
      received.current += 1;
      replace(next);
    },
    [replace],
  );

  const refresh = useCallback(() => {
    if (bunchId === undefined || bundleId === undefined) return;
    const seen = received.current;
    getBundlePresence(bunchId, bundleId).then(
      (next) => {
        if (received.current === seen) replace(next);
      },
      // 복구 조회에 실패해도 이후 PRESENCE와 만료로 맞춰짐
      () => undefined,
    );
  }, [bunchId, bundleId, replace]);

  const visible = useMemo(() => activePresence(data, now), [data, now]);

  // 가장 먼저 만료되는 항목 시각에 다시 계산(서버의 정리 주기와 상관없이 표시 기한을 지킴)
  useEffect(() => {
    const at = nextExpiry(visible);
    if (at === undefined) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, at - Date.now()) + 1);
    return () => clearTimeout(timer);
  }, [visible]);

  const presence = useMemo(() => toDraftPresence(visible), [visible]);
  return { presence, apply, refresh };
}

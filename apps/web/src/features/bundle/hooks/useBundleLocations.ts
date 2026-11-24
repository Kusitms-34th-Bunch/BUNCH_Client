'use client';

import { toast } from '@app/design-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reportApiError } from '@/shared/lib/reportApiError';
import type { DraftLocation } from '../lib/types';
import { applyBundleLocationIntent, readLocationRejection } from '../api/locations';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../constants/messages';
import {
  applyLocationOps,
  isPendingLocation,
  locationKey,
  neighborsAfterMove,
  type LocationInput,
  type LocationNeighbor,
  type LocationOp,
} from '../lib/locationOps';
import { useLocationCache } from '../queries/locations';

type Options = {
  bunchId: string | undefined;
  bundleId: string | undefined;
  /** 서버 상세의 장소 목록(앞선 변경이 반영된 최신 값) */
  serverLocations: readonly DraftLocation[];
  /** 연결이 끊겨 편집을 막는 동안: 눌러도 반응하지 않음(기능 spec 4.3.14) */
  blocked: boolean;
  /**
   * 지금 이 순간 실시간 연결이 끊겼는지(렌더를 기다리지 않고 바로 읽는 함수)
   * 끊김을 화면이 알아채 `discard`가 실행되기 전에 대기열 차례가 오는 경우를 막으려고 보내기 직전에 확인함
   */
  isOffline?: (() => boolean) | undefined;
};

const REJECTION_MESSAGE = {
  LOCATION_DUPLICATE: BUNDLE_MESSAGES.locationDuplicate,
  LOCATION_CAPACITY_EXCEEDED: BUNDLE_MESSAGES.locationMax,
  LOCATION_REMOVED: BUNDLE_MESSAGES.locationRemoved,
} as const;

/**
 * 위치 추가·교체·삭제·순서 변경(기능 spec 4.3.10): 내 변경은 화면에 먼저 보이고 서버에는 하나씩 순서대로 보냄
 * - 보이는 목록 = 서버 목록 + 아직 끝나지 않은 내 변경(서버 목록이 이벤트로 바뀌어도 그 위에 다시 얹음)
 * - 서버가 거절하면(중복·3개 초과·삭제된 줄) 그 변경만 걷고 명세 문구로 알림, 그 밖의 오류는 걷고 최신 상세로 맞춤
 * - 이동은 이동한 뒤의 앞뒤 장소를 서버 목록에서 찾아 보내 앞선 변경으로 줄 id가 새로 생겨도 맞음
 * - 보내는 중·기다리는 변경이 있으면 `pending`(저장 중 표시), `settled()`로 모두 끝나길 기다림(발행 전)
 * - `discard()`: 연결이 끊기면 아직 보내지 않은 변경을 버림(기능 spec 4.3.14). 이미 보낸 요청의 결과는 서버 기준이라 그대로 반영됨
 */
export function useBundleLocations({
  bunchId,
  bundleId,
  serverLocations,
  blocked,
  isOffline,
}: Options) {
  const cache = useLocationCache(bunchId, bundleId);
  const [ops, setOps] = useState<readonly LocationOp[]>([]);
  // 서버로 보낸 뒤 응답을 기다리는 요청 수(연결이 끊겨 낙관적 변경을 걷어도 응답이 올 때까지는 저장 중으로 보임)
  const [sending, setSending] = useState(0);
  const nextNo = useRef(1);
  // 이 번호가 바뀌면 그 전에 대기열에 들어간 변경은 보내지 않음(버린 변경)
  const generation = useRef(0);
  // 보낸 요청과 실패한 요청의 누적 횟수(발행 전에 기다리는 동안 늘었는지로 판단)
  const sentCount = useRef(0);
  const failedCount = useRef(0);
  // 내 변경 요청을 하나씩 순서대로 보내는 대기열
  const queue = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  const blockedRef = useRef(blocked);
  const isOfflineRef = useRef(isOffline);

  const locations = useMemo(() => applyLocationOps(serverLocations, ops), [serverLocations, ops]);
  const locationsRef = useRef(locations);
  useEffect(() => {
    blockedRef.current = blocked;
    isOfflineRef.current = isOffline;
    locationsRef.current = locations;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const enqueue = useCallback(
    (op: LocationOp) => {
      if (!bunchId || !bundleId) return;
      setOps((current) => [...current, op]);
      const enqueuedAt = generation.current;

      queue.current = queue.current.then(async () => {
        // 연결이 끊겨 버린 변경은 보내지 않음(화면의 낙관적 표시는 discard가 이미 걷음)
        if (enqueuedAt !== generation.current) return;
        // 끊김을 화면이 알아채 discard가 실행되기 전에 이 차례가 온 경우를 막으려고 보내기 직전에 브라우저 연결 상태를 직접 확인함
        // 끊겨 있으면 이 변경과 뒤에 대기 중인 변경을 모두 버림(재연결 때 최신 상세로 맞춰짐)
        // 브라우저 연결이 끊겼거나(navigator) 실시간 연결이 끊겼으면(isOffline) 보내지 않음
        if (
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          isOfflineRef.current?.() === true
        ) {
          generation.current += 1;
          setOps([]);
          return;
        }
        setSending((count) => count + 1);
        try {
          // 앞선 변경이 끝난 서버 목록으로 보낼 줄 id를 정함(내가 막 추가한 줄도 이때는 서버 id가 있음)
          const serverList = cache.readDetail()?.locations ?? [];
          // 이웃은 서버 id가 있으면 그 id로, 아직 없던 줄(내가 막 추가한 줄)은 장소 키로 서버 목록에서 찾음
          const idOf = (neighbor: LocationNeighbor | null) =>
            neighbor === null
              ? null
              : (neighbor.id ??
                serverList.find((location) => locationKey(location) === neighbor.key)?.id ??
                null);
          const result = await applyBundleLocationIntent(
            bunchId,
            bundleId,
            op.kind === 'add'
              ? { intent: 'ADD', place: op.place }
              : op.kind === 'replace'
                ? { intent: 'REPLACE', targetLocationId: op.targetId, place: op.place }
                : op.kind === 'remove'
                  ? { intent: 'REMOVE', targetLocationId: op.targetId }
                  : {
                      intent: 'MOVE',
                      targetLocationId: op.targetId,
                      previousLocationId: idOf(op.previous),
                      nextLocationId: idOf(op.next),
                    },
          );
          cache.writeLocations(result.locations, result.locationVersion);
          sentCount.current += 1;
        } catch (error) {
          failedCount.current += 1;
          // mutation을 거치지 않는 요청이라 직접 보고(업무 거절·네트워크는 보고 기준에서 빠짐)
          reportApiError(error);
          const rejection = readLocationRejection(error);
          if (rejection) {
            toast(REJECTION_MESSAGE[rejection]);
          } else {
            toast(BUNDLE_MESSAGES.locationSaveFailed);
          }
          // 거절·실패한 변경은 걷고 서버의 최신 목록으로 맞춤
          void cache.refetch();
        } finally {
          setSending((count) => count - 1);
          // 응답이 캐시에 반영돼 화면에 그려진 뒤에 내 변경을 걷어 줄이 한 프레임 사라지지 않게 함
          setTimeout(() => {
            if (alive.current) setOps((current) => current.filter((item) => item.no !== op.no));
          }, 0);
        }
      });
    },
    [bunchId, bundleId, cache],
  );

  const newNo = () => nextNo.current++;

  const discard = useCallback(() => {
    generation.current += 1;
    setOps([]);
  }, []);

  // 지금까지 들어온 변경이 모두 끝나길 기다림(기다리는 사이 새로 들어온 변경까지)
  // 기다리는 동안 서버에 반영된 요청이 있었는지(`sent`)와 실패한 요청이 있었는지(`failed`)를 돌려줌
  const settled = useCallback(async () => {
    const sentBefore = sentCount.current;
    const failedBefore = failedCount.current;
    let waited: Promise<void>;
    do {
      waited = queue.current;
      await waited;
    } while (waited !== queue.current);
    return {
      sent: sentCount.current !== sentBefore,
      failed: failedCount.current !== failedBefore,
    };
  }, []);

  const add = useCallback(
    (place: LocationInput) => {
      if (blockedRef.current) return;
      const current = locationsRef.current;
      // 같은 장소가 이미 있거나 3개가 찼으면 서버에 보내지 않고 명세 문구로 알림
      if (current.some((location) => locationKey(location) === locationKey(place))) {
        toast(BUNDLE_MESSAGES.locationDuplicate);
        return;
      }
      if (current.length >= MAX_LOCATIONS) {
        toast(BUNDLE_MESSAGES.locationMax);
        return;
      }
      enqueue({ no: newNo(), kind: 'add', place });
    },
    [enqueue],
  );

  const replace = useCallback(
    (targetId: string, place: LocationInput) => {
      if (blockedRef.current) return;
      const current = locationsRef.current;
      const target = current.find((location) => location.id === targetId);
      // 서버 id가 아직 없는 줄은 바꾸지 않음
      if (target && isPendingLocation(target)) return;
      if (
        current.some(
          (location) => location.id !== targetId && locationKey(location) === locationKey(place),
        )
      ) {
        toast(BUNDLE_MESSAGES.locationDuplicate);
        return;
      }
      // 같은 장소로 바꾸면 달라질 게 없음
      if (target && locationKey(target) === locationKey(place)) return;
      enqueue({ no: newNo(), kind: 'replace', targetId, place });
    },
    [enqueue],
  );

  const remove = useCallback(
    (targetId: string) => {
      if (blockedRef.current) return;
      const target = locationsRef.current.find((location) => location.id === targetId);
      if (!target || isPendingLocation(target)) return;
      enqueue({ no: newNo(), kind: 'remove', targetId });
    },
    [enqueue],
  );

  const move = useCallback(
    (targetId: string, toIndex: number) => {
      if (blockedRef.current) return;
      const current = locationsRef.current;
      const target = current.find((location) => location.id === targetId);
      // 끌던 줄을 그사이 다른 멤버가 지웠으면 손을 뗄 때 알림(기능 spec 4.3.10 로직 8)
      if (!target) {
        // 끄는 사이 내가 막 추가한 줄이 서버 id로 바뀐 경우는 지워진 게 아니므로 알리지 않음
        if (!isPendingLocation({ id: targetId })) toast(BUNDLE_MESSAGES.locationRemoved);
        return;
      }
      if (isPendingLocation(target)) return;
      const { previous, next } = neighborsAfterMove(current, targetId, toIndex);
      enqueue({ no: newNo(), kind: 'move', targetId, toIndex, previous, next });
    },
    [enqueue],
  );

  return {
    locations,
    add,
    replace,
    remove,
    move,
    pending: ops.length > 0 || sending > 0,
    settled,
    discard,
  };
}

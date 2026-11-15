'use client';

import { toast } from '@app/design-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DraftLocation } from '../lib/types';
import { applyBundleLocationIntent, readLocationRejection } from '../api/bundles';
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
 */
export function useBundleLocations({ bunchId, bundleId, serverLocations, blocked }: Options) {
  const cache = useLocationCache(bunchId, bundleId);
  const [ops, setOps] = useState<readonly LocationOp[]>([]);
  const nextNo = useRef(1);
  // 내 변경 요청을 하나씩 순서대로 보내는 대기열
  const queue = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  const blockedRef = useRef(blocked);

  const locations = useMemo(() => applyLocationOps(serverLocations, ops), [serverLocations, ops]);
  const locationsRef = useRef(locations);
  useEffect(() => {
    blockedRef.current = blocked;
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

      queue.current = queue.current.then(async () => {
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
        } catch (error) {
          const rejection = readLocationRejection(error);
          if (rejection) {
            toast(REJECTION_MESSAGE[rejection]);
          } else {
            toast(BUNDLE_MESSAGES.locationSaveFailed);
          }
          // 거절·실패한 변경은 걷고 서버의 최신 목록으로 맞춤
          void cache.refetch();
        } finally {
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
        toast(BUNDLE_MESSAGES.locationRemoved);
        return;
      }
      if (isPendingLocation(target)) return;
      const { previous, next } = neighborsAfterMove(current, targetId, toIndex);
      enqueue({ no: newNo(), kind: 'move', targetId, toIndex, previous, next });
    },
    [enqueue],
  );

  return { locations, add, replace, remove, move };
}

import { useSyncExternalStore } from 'react';
import type { BlockedBunch } from '../lib/types';
import { blockedBunchesFixture } from '../fixtures/blockedBunches.fixture';

type Blocked = Readonly<Record<string, readonly BlockedBunch[]>>;

// 차단 API 연결 전 차단 해제 결과를 담는 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 차단 해제 mutation과 차단 목록 query 갱신으로 대체
const EMPTY: Blocked = {};
let changed: Blocked = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const remove = (bunchId: string, blockedId: string) => {
  const current = changed[bunchId] ?? blockedBunchesFixture[bunchId] ?? [];
  changed = { ...changed, [bunchId]: current.filter((bunch) => bunch.id !== blockedId) };
  listeners.forEach((listener) => listener());
};

/**
 * 번치의 차단 목록과 차단 해제. 번치를 아직 모르면 blocked가 undefined
 * 서버 렌더는 fixture 그대로라 hydration 결과가 같음
 */
export function useBlockedBunches(bunchId: string | undefined) {
  const all = useSyncExternalStore(
    subscribe,
    () => changed,
    () => EMPTY,
  );
  const blocked =
    bunchId === undefined ? undefined : (all[bunchId] ?? blockedBunchesFixture[bunchId] ?? []);
  const unblock = (blockedId: string) => {
    if (bunchId !== undefined) remove(bunchId, blockedId);
  };
  return { blocked, unblock };
}

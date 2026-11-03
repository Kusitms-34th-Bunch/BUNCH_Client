import { useSyncExternalStore } from 'react';
import type { BlockedBunch } from '../lib/types';
import { blockedBunchesFixture } from '../fixtures/blockedBunches.fixture';

type Blocked = Readonly<Record<string, readonly BlockedBunch[]>>;

// 차단 API 연결 전 차단·차단 해제 결과를 담는 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 차단·차단 해제 mutation과 차단 목록 query 갱신으로 대체
const EMPTY: Blocked = {};
let changed: Blocked = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const listOf = (bunchId: string) => changed[bunchId] ?? blockedBunchesFixture[bunchId] ?? [];

const update = (bunchId: string, next: readonly BlockedBunch[]) => {
  changed = { ...changed, [bunchId]: next };
  listeners.forEach((listener) => listener());
};

const remove = (bunchId: string, blockedId: string) =>
  update(
    bunchId,
    listOf(bunchId).filter((bunch) => bunch.id !== blockedId),
  );

// 최근 차단이 목록 맨 위
const add = (bunchId: string, target: BlockedBunch) =>
  update(bunchId, [target, ...listOf(bunchId).filter((bunch) => bunch.id !== target.id)]);

/**
 * 번치의 차단 목록과 차단·차단 해제. 번치를 아직 모르면 blocked가 undefined
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
  const block = (target: BlockedBunch) => {
    if (bunchId !== undefined) add(bunchId, target);
  };
  return { blocked, unblock, block };
}

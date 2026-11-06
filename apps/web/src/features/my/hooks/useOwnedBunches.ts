import { useSyncExternalStore } from 'react';
import type { OwnedBunch } from '../lib/types';
import { ownedBunchesFixture } from '../fixtures/withdrawal.fixture';

// 메인 관리자 확인·권한 이전 API 연결 전 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 메인 관리자 번치 query와 권한 이전 mutation으로 대체
let owned: readonly OwnedBunch[] = ownedBunchesFixture;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getOwnedBunches = () => owned;

/** 고른 멤버에게 권한을 넘긴 번치를 목록에서 뺌(번치 ID → 새 메인 관리자 ID) */
export const transferOwnership = (selections: Readonly<Record<string, string>>) => {
  owned = owned.filter((bunch) => !(bunch.id in selections));
  listeners.forEach((listener) => listener());
};

/** 테스트에서 저장소를 처음 값으로 되돌림 */
export const resetOwnedBunches = (next: readonly OwnedBunch[] = ownedBunchesFixture) => {
  owned = next;
  listeners.forEach((listener) => listener());
};

/** 내가 메인 관리자인 번치. 서버 렌더는 fixture */
export function useOwnedBunches() {
  return useSyncExternalStore(subscribe, getOwnedBunches, () => ownedBunchesFixture);
}

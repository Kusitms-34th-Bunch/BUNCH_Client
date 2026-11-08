import { useSyncExternalStore } from 'react';
import type { OwnedBunch } from '../lib/types';
import { ownedBunchesFixture } from '../fixtures/withdrawal.fixture';

// 메인 관리자 확인·권한 이전 API 연결 전 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 메인 관리자 번치 query와 권한 이전 mutation으로 대체
// 넘길 멤버가 없는(나 혼자 있는) 번치는 넘기지 않고 탈퇴할 때 함께 삭제(기능명세서 7.6.3 로직 4)
const withMembers = (bunches: readonly OwnedBunch[]) =>
  bunches.filter((bunch) => bunch.candidates.length > 0);
const initialOwned = withMembers(ownedBunchesFixture);
let owned: readonly OwnedBunch[] = initialOwned;
const listeners = new Set<() => void>();
// 권한을 넘기고 돌아왔는지(탈퇴 안내의 확인 체크를 유지, 기능명세서 7.6.1 로직 1)
let keepAgreed = false;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getOwnedBunches = () => owned;

/** 고른 멤버에게 권한을 넘긴 번치를 목록에서 뺌(번치 ID → 새 메인 관리자 ID) */
export const transferOwnership = (selections: Readonly<Record<string, string>>) => {
  owned = owned.filter((bunch) => !(bunch.id in selections));
  keepAgreed = true;
  listeners.forEach((listener) => listener());
};

/** 테스트에서 저장소를 처음 값으로 되돌림 */
export const resetOwnedBunches = (next: readonly OwnedBunch[] = ownedBunchesFixture) => {
  owned = withMembers(next);
  keepAgreed = false;
  listeners.forEach((listener) => listener());
};

/** 탈퇴 안내가 들어올 때 한 번 읽고 지움 */
export const consumeKeepAgreed = () => {
  const kept = keepAgreed;
  keepAgreed = false;
  return kept;
};

// 탈퇴 안내에서 들어왔는지(완료 뒤 뒤로 가기로 돌아갈지, 탈퇴 안내로 바로 갈지 판단)
let enteredFromGuide = false;

/** 탈퇴 안내의 「권한 넘기러 가기」가 이동 직전에 표시 */
export const markTransferFromGuide = () => {
  enteredFromGuide = true;
};

/** 권한 이전 화면이 들어올 때 한 번 읽고 지움 */
export const consumeTransferFromGuide = () => {
  const entered = enteredFromGuide;
  enteredFromGuide = false;
  return entered;
};

/** 내가 메인 관리자인 번치. 서버 렌더는 fixture */
export function useOwnedBunches() {
  return useSyncExternalStore(subscribe, getOwnedBunches, () => initialOwned);
}

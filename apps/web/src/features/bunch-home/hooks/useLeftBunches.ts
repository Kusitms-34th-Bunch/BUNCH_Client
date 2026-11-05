import { useSyncExternalStore } from 'react';
import { bunchSummariesFixture } from '../fixtures/bunchHome.fixture';

// 번치 API 연결 전 나간 번치를 담는 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 나가기 mutation과 번치 목록 query 갱신으로 대체
const EMPTY: ReadonlySet<string> = new Set();
let left: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();

/** 나간 번치 저장소 구독(현재 번치 저장소가 함께 다시 읽도록 공개) */
export const subscribeLeftBunches = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getLeftBunches = () => left;

/** 남아 있는 접근 가능 번치 중 첫 번째(나간 뒤 이동할 번치). 없으면 null */
export const firstRemainingBunchId = (excluded: ReadonlySet<string>) =>
  bunchSummariesFixture.find((bunch) => bunch.access === 'active' && !excluded.has(bunch.id))?.id ??
  null;

/** 번치에서 나가고 이동할 다음 번치 ID를 돌려줌(남은 번치가 없으면 null) */
export const leaveBunch = (bunchId: string) => {
  left = new Set(left).add(bunchId);
  listeners.forEach((listener) => listener());
  return firstRemainingBunchId(left);
};

/** 나간 번치 ID. 서버 렌더는 빈 값 */
export function useLeftBunches() {
  return useSyncExternalStore(subscribeLeftBunches, getLeftBunches, () => EMPTY);
}

import { useSyncExternalStore } from 'react';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { firstRemainingBunchId, getLeftBunches, subscribeLeftBunches } from './useLeftBunches';

// 번치 API 연결 전 지금 번치를 화면 사이(번치 홈 ↔ 더보기 메뉴)와 새로고침에 유지. 연결하면 서버의 마지막 사용 번치로 대체
const STORAGE_KEY = 'bunch-home:current-bunch-id';
const initialId = initialBunchDetailFixture.id;
const listeners = new Set<() => void>();
// 저장소를 읽거나 쓸 수 없는 환경(사생활 보호 모드·용량 초과)의 대체 값
let memoryId: string | null = null;

// fixture에 없는 ID(직접 바꾼 저장값, constructor 같은 상속 속성 이름)는 기본 번치로
const known = (bunchId: string | null) =>
  bunchId !== null && Object.hasOwn(bunchDetailsFixture, bunchId) ? bunchId : initialId;

const readStored = () => {
  if (memoryId !== null) return known(memoryId);
  try {
    return known(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return initialId;
  }
};

// 나간 번치를 가리키면 남은 첫 번치로, 남은 번치가 없으면 null(모든 화면이 나간 번치를 다시 그리지 않게)
const read = () => {
  const stored = readStored();
  const left = getLeftBunches();
  return left.has(stored) ? firstRemainingBunchId(left) : stored;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const unsubscribeLeft = subscribeLeftBunches(listener);
  return () => {
    listeners.delete(listener);
    unsubscribeLeft();
  };
};

const write = (bunchId: string) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, bunchId);
    memoryId = null;
  } catch {
    memoryId = bunchId;
  }
  listeners.forEach((listener) => listener());
};

/** 지금 번치 ID와 바꾸는 함수. 서버 렌더와 첫 hydration은 저장값을 모르므로 null, 참여 번치가 하나도 없어도 null */
export function useCurrentBunchId(): readonly [string | null, (_bunchId: string) => void] {
  return [useSyncExternalStore(subscribe, read, () => null), write];
}

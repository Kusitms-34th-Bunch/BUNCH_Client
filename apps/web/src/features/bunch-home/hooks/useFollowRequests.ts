import { useSyncExternalStore } from 'react';
import { findBunchFollows } from '../fixtures/bunchFollows.fixture';

// 팔로우 API 연결 전 요청 승인·거절 결과를 담는 임시 저장소(메모리, 내 번치 id별)
// 연결하면 승인·거절 mutation과 팔로워·요청 query 갱신으로 대체
type Decision = 'approved' | 'rejected';
type Decisions = Readonly<Record<string, Readonly<Record<string, Decision>>>>;
const EMPTY: Decisions = {};
let decisions = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const decide = (bunchId: string, requesterId: string, decision: Decision) => {
  decisions = { ...decisions, [bunchId]: { ...decisions[bunchId], [requesterId]: decision } };
  listeners.forEach((listener) => listener());
};

/**
 * 내 번치의 대기 중인 팔로우 요청과 승인한 번치(팔로워 목록 맨 위에 더함). 승인·거절은 확인 없이 바로 처리(화면설계서 2500:72664 3·4번)
 * bunchId가 없으면(첫 hydration) 빈 목록
 */
export function useFollowRequests(bunchId: string | undefined) {
  const all = useSyncExternalStore(
    subscribe,
    () => decisions,
    () => EMPTY,
  );
  const mine = (bunchId && all[bunchId]) || {};
  const requests = bunchId ? findBunchFollows(bunchId).requests : [];
  return {
    pending: requests.filter(({ bunchId: requesterId }) => !mine[requesterId]),
    /** 승인한 순서의 역순(최근 승인이 위) */
    approvedIds: Object.keys(mine)
      .filter((requesterId) => mine[requesterId] === 'approved')
      .reverse(),
    approve: (requesterId: string) => {
      if (bunchId) decide(bunchId, requesterId, 'approved');
    },
    reject: (requesterId: string) => {
      if (bunchId) decide(bunchId, requesterId, 'rejected');
    },
  };
}

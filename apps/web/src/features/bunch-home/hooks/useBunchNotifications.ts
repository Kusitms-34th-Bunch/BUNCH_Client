import { useMemo, useSyncExternalStore } from 'react';
import { bunchNotificationsFixture } from '../fixtures/bunchNotifications.fixture';

// 알림 API 연결 전 읽음 처리 결과를 담는 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 알림 목록 query와 읽음 mutation으로 대체
const EMPTY: ReadonlySet<string> = new Set();
let read = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const markRead = (ids: readonly string[]) => {
  read = new Set([...read, ...ids]);
  listeners.forEach((listener) => listener());
};

const withReadState = (bunchId: string, readIds: ReadonlySet<string>) =>
  (bunchNotificationsFixture[bunchId] ?? []).map((notification) =>
    readIds.has(notification.id) ? { ...notification, unread: false } : notification,
  );

/** 번치마다 읽지 않은 알림 수(전환 목록의 「알림 N개」) */
export function useUnreadNotificationCounts(): Readonly<Record<string, number>> {
  const readIds = useSyncExternalStore(
    subscribe,
    () => read,
    () => EMPTY,
  );
  // 읽음이 바뀔 때만 새 객체(번치 홈 데이터 memo가 매 렌더 다시 계산되지 않게)
  return useMemo(
    () =>
      Object.fromEntries(
        Object.keys(bunchNotificationsFixture).map((bunchId) => [
          bunchId,
          withReadState(bunchId, readIds).filter((notification) => notification.unread).length,
        ]),
      ),
    [readIds],
  );
}

/**
 * 번치의 알림 목록(최신순)과 읽음 처리. 번치를 아직 모르면 notifications가 undefined
 * 서버 렌더는 fixture 그대로라 hydration 결과가 같음
 */
export function useBunchNotifications(bunchId: string | undefined) {
  const readIds = useSyncExternalStore(
    subscribe,
    () => read,
    () => EMPTY,
  );
  const notifications = bunchId === undefined ? undefined : withReadState(bunchId, readIds);
  return {
    notifications,
    readOne: (id: string) => markRead([id]),
    readAll: () => markRead(notifications?.map((notification) => notification.id) ?? []),
  };
}

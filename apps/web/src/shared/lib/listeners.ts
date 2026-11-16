/** 외부 저장소의 구독·알림(useSyncExternalStore의 subscribe 계약). 알림 중 구독 해제는 Set 순회 규칙을 따름 */
export const createListeners = () => {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: () => {
      for (const listener of listeners) listener();
    },
  };
};

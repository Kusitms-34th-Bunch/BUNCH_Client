'use client';

import { useReducer, useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

// hydration 불일치 방지를 위해 서버·첫 렌더에서는 연결된 것으로 취급
const getServerSnapshot = () => true;

/**
 * 브라우저가 알려 주는 연결 상태. `recheck`는 「재시도」에서 지금 상태를 다시 읽음
 * 서버에 닿는지까지는 알 수 없고, 저장 요청이 연결되면 그 실패도 이 값과 함께 다뤄야 함
 */
export function useOnlineStatus() {
  const [, recheck] = useReducer((count: number) => count + 1, 0);
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, getServerSnapshot);
  return { online, recheck };
}

import { useState, useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;
const getHydrated = () => true;
const getServerHydrated = () => false;

/**
 * 경과 시간 기준 시각: 화면에 들어온(마운트한) 시각이라 피드에 다시 들어오면 갱신됨
 * 서버 렌더·첫 hydration은 null이라 서버·브라우저 시계가 달라도 글자가 어긋나지 않음
 */
export function useClientNow() {
  const [enteredAt] = useState(() => Date.now());
  const hydrated = useSyncExternalStore(subscribe, getHydrated, getServerHydrated);
  return hydrated ? enteredAt : null;
}

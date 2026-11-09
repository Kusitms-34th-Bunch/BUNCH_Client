import { useEffect, useState, useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;
const getHydrated = () => true;
const getServerHydrated = () => false;

/**
 * 경과 시간 기준 시각: 화면에 들어온 시각. 탭·앱으로 돌아와 다시 보일 때도 갱신(iOS는 탭 WebView가 유지됨)
 * 서버 렌더·첫 hydration은 null이라 서버·브라우저 시계가 달라도 글자가 어긋나지 않음
 */
export function useClientNow() {
  const [enteredAt, setEnteredAt] = useState(() => Date.now());
  const hydrated = useSyncExternalStore(subscribe, getHydrated, getServerHydrated);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setEnteredAt(Date.now());
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  return hydrated ? enteredAt : null;
}

import { useSyncExternalStore } from 'react';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(listener: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getSnapshot = () => window.matchMedia(MOTION_QUERY).matches;
// hydration 불일치 방지를 위해 서버·첫 렌더에서는 움직임 없는 상태로 취급
const getServerSnapshot = () => true;

/** 동작 줄이기(`prefers-reduced-motion: reduce`) 설정. 설정을 바꾸면 다시 렌더 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import { useSyncExternalStore } from 'react';

// 이 페이지를 연 시각. 서버 렌더와 첫 hydration은 null이라 서버·브라우저 시계가 달라도 글자가 어긋나지 않음
let pageOpenedAt: number | undefined;
const subscribe = () => () => undefined;
const getSnapshot = () => (pageOpenedAt ??= Date.now());
const getServerSnapshot = () => null;

/** 경과 시간 기준 시각(브라우저에서만). 서버 렌더·첫 hydration은 null */
export function useClientNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

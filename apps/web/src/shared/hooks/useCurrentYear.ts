import { useSyncExternalStore } from 'react';

// 화면이 다시 보일 때 다시 읽음(앱을 연 채 해가 바뀐 경우)
const subscribe = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};
const getYear = () => new Date().getFullYear();
const getServerYear = () => null;

/**
 * 올해(연도 표기 생략 판단용). 서버 렌더·첫 hydration은 null이라 서버·브라우저 시계가 달라도 글자가 어긋나지 않음
 * null이면 쓰는 쪽은 연도를 붙여 보여 줌(`year !== currentYear`)
 */
export const useCurrentYear = (): number | null =>
  useSyncExternalStore(subscribe, getYear, getServerYear);

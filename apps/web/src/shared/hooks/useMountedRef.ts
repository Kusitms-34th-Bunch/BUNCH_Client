import { useEffect, useRef } from 'react';

/**
 * 화면이 붙어 있는지(기다리던 응답·창이 끝났을 때 떠난 화면이면 이동·안내를 하지 않게)
 * Strict Mode의 다시 붙이기에서도 true로 되돌림. passive effect라 Suspense로 숨겨진 동안은 true 유지
 */
export function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

'use client';

import { useEffect, useRef } from 'react';

/**
 * 요청 중 비활성으로 잃은 키보드 초점을, 실패해 버튼이 다시 눌릴 수 있게 된 렌더 뒤에 그 버튼으로 돌려줌
 * `[ref, refocus]`를 돌려줌. `refocus()`는 비활성인 동안 실패했을 때나 요청을 보내는 순간에 부름(성공하면 이동해 남은 요청은 사라짐)
 */
export function useRefocusWhenEnabled<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || !requested.current) return;
    requested.current = false;
    ref.current?.focus();
  }, [enabled]);

  const refocus = () => {
    requested.current = true;
  };
  return [ref, refocus] as const;
}

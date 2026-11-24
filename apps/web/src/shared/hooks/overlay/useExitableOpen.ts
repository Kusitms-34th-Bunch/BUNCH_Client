import { useState } from 'react';

/**
 * 닫히는 모션이 끝날 때까지 화면에 남는 메뉴의 열림(`open`)과 그림(`mounted`)
 * `close`는 모션을 재생하고, 모션이 끝나면 메뉴의 `onExited`로 `exited`를 부름. `hide`는 모션 없이 바로 뺌
 */
export function useExitableOpen() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return {
    open,
    mounted,
    toggle: () => {
      setMounted(true);
      setOpen((current) => !current);
    },
    close: () => setOpen(false),
    exited: () => setMounted(false),
    hide: () => {
      setOpen(false);
      setMounted(false);
    },
  };
}

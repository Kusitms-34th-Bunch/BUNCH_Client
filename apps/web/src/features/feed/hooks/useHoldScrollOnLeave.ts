import { useLayoutEffect, type RefObject } from 'react';

/**
 * 화면을 떠날 때 스크롤을 transform으로 옮겨 둠(뒤로 가기 경로와 무관, 이동이 취소되면 실행되지 않음)
 * 스크롤은 페이지 안 main이 맡고, 나가는 화면은 DOM에 다시 붙으며 스크롤이 0이 되어 맨 위로 튀므로 필요
 */
export function useHoldScrollOnLeave(anchorRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const main = anchorRef.current?.closest('main');
    // Strict Mode의 재실행으로 남은 값 제거(그대로 두면 복원한 스크롤과 겹쳐 2배로 밀림)
    for (const child of main?.children ?? []) {
      if (child instanceof HTMLElement) child.style.transform = '';
    }
    return () => {
      if (!main?.scrollTop) return;
      for (const child of main.children) {
        if (child instanceof HTMLElement) {
          child.style.transform = `translateY(${-main.scrollTop}px)`;
        }
      }
      main.scrollTop = 0;
    };
  }, [anchorRef]);
}

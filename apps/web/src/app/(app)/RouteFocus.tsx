'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';

const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);
// 전환 중 나가는 화면(AppTransitions)과 열린 모달 바깥(Base UI)은 inert
const OUTSIDE = '[inert], [data-page-leaving]';
const SELECTED_TAB = '[data-main-tab-bar] [aria-current="page"]';

const findHeading = () =>
  [...document.querySelectorAll('h1')].find((heading) => !heading.closest(OUTSIDE));

/**
 * 다른 화면으로 이동하면(앞으로·뒤로) 새 화면의 h1으로 초점(docs/architecture/web-interface-guidelines.md)
 * 처음 로드는 브라우저 기본, 하단 탭을 눌러 탭 루트끼리 이동하면 누른 탭에 초점 유지
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (from === pathname) return;
    // 하단 탭을 눌러 옮겼으면 누른(지금 선택된) 탭에 초점 유지. 뒤로·앞으로 가기는 이전 탭에 초점이 남아 새 화면 h1으로
    const tabSwitch = tabPaths.includes(from) && tabPaths.includes(pathname);
    if (tabSwitch && document.activeElement?.closest(SELECTED_TAB)) return;

    // 이동을 누른 요소(나가는 화면·닫히는 모달 안)와 이 컴포넌트가 준 제목 초점은 남은 초점으로 보지 않음
    const pressed = document.activeElement;
    let focused: Element | null = null;
    // 기다리는 사이 사용자나 화면이 다른 곳으로 옮긴 초점은 그대로 둠
    const focusMovedElsewhere = () => {
      const active = document.activeElement;
      return (
        active !== null &&
        active !== document.body &&
        active !== pressed &&
        active !== focused &&
        active.isConnected &&
        !active.closest(OUTSIDE)
      );
    };
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(focusHeading);
    });
    function focusHeading() {
      if (focusMovedElsewhere()) return observer.disconnect();
      const heading = findHeading();
      if (!heading || heading === document.activeElement) return;
      focused = heading;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    // 제목이 늦게 그려지거나, 초점을 준 제목에 나가는 화면 표식이 늦게 붙으면 다시 찾음
    // ponytail: 사용자가 초점을 옮기거나 다음 이동 때까지 관찰(DOM 변경마다 프레임당 h1 조회 한 번)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['inert', 'data-page-leaving'],
    });
    // 전환이 나가는 화면을 표시한 뒤 찾도록 한 프레임 뒤에 시작
    frame = requestAnimationFrame(focusHeading);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}

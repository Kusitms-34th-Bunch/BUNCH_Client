'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';
import { quietFocus } from '@/shared/lib/quietFocus';

const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);
// 전환 중 나가는 화면(AppTransitions)과 열린 모달 바깥(Base UI)은 inert
const OUTSIDE = '[inert], [data-page-leaving]';
const SELECTED_TAB = '[data-main-tab-bar] [aria-current="page"]';

// 텍스트 입력은 뺌(초점을 주면 iOS 키보드가 올라옴)
const FOCUSABLE = 'a[href], button:not([disabled])';

const findHeading = () =>
  [...document.querySelectorAll('h1')].find((heading) => !heading.closest(OUTSIDE));

// 뒤로 가기로 돌아온 화면: 떠날 때 스크롤이 이 기록 항목에 저장돼 있음(useScrollInHistory)
const returnedToSavedScroll = () => {
  const saved = (window.history.state as { pageScroll?: unknown } | null)?.pageScroll;
  return typeof saved === 'number' && saved > 0;
};

/** 복원된 위치에서 위쪽이 보이는 첫 링크·버튼(접는 헤더에 가린 위쪽 여백은 뺌) */
const findVisibleControl = (main: HTMLElement) => {
  const box = main.getBoundingClientRect();
  const top = box.top + (Number.parseFloat(getComputedStyle(main).scrollPaddingTop) || 0);
  return [...main.querySelectorAll<HTMLElement>(FOCUSABLE)].find((element) => {
    if (element.closest(OUTSIDE)) return false;
    const rect = element.getBoundingClientRect();
    return rect.height > 0 && rect.top >= top && rect.top < box.bottom;
  });
};

/**
 * 다른 화면으로 이동하면(앞으로·뒤로) 새 화면의 h1으로 초점(docs/architecture/web-interface-guidelines.md)
 * 뒤로 가기로 스크롤을 복원한 화면은 보이는 첫 요소로(Tab이 맨 위로 튀지 않게). 처음 로드는 브라우저 기본, 탭 루트끼리는 누른 탭 유지
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
    const restored = returnedToSavedScroll();
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
    const observer = new MutationObserver((records) => {
      cancelAnimationFrame(frame);
      // 복원 대기가 키 입력으로 끝나면 그 키(Tab)의 기본 동작 전에 바로 옮김(프레임을 기다리면 제목 다음 맨 위 요소로 감)
      if (records.some((record) => record.attributeName === 'data-scroll-restoring'))
        return focusHeading();
      frame = requestAnimationFrame(focusHeading);
    });
    function focusHeading() {
      if (focusMovedElsewhere()) return observer.disconnect();
      const heading = findHeading();
      // 복원 전(높이가 모자라 다시 맞추는 중 포함)에는 제목에 두었다가 복원되면 보이는 요소로 옮김
      const main = heading?.closest('main');
      const settled = main && main.scrollTop > 0 && !main.hasAttribute('data-scroll-restoring');
      const target = restored && settled ? (findVisibleControl(main) ?? heading) : heading;
      if (!target || target === document.activeElement) return;
      focused = target;
      if (target !== heading) {
        // 조작 요소는 iOS가 코드로 준 초점에도 테두리를 그려, 키를 누르기 전까지 감춤
        // 한 번 옮기면 관찰을 멈춤(뒤늦은 DOM 변화로 사용자가 만지지 않은 초점이 다시 옮겨지지 않게)
        quietFocus(target);
        observer.disconnect();
        return;
      }
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
    // 제목이 늦게 그려지거나, 초점을 준 제목에 나가는 화면 표식이 늦게 붙으면 다시 찾음
    // ponytail: 사용자가 초점을 옮기거나 다음 이동 때까지 관찰(DOM 변경마다 프레임당 h1 조회 한 번)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['inert', 'data-page-leaving', 'data-scroll-restoring'],
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

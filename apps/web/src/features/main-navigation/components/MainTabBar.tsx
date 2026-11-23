'use client';

import {
  FillConfettiLargeIcon,
  FillHomeLargeIcon,
  FillPhotoLargeIcon,
  FillUserLargeIcon,
  LineConfettiLargeIcon,
  LineHomeLargeIcon,
  LinePhotoLargeIcon,
  LineUserLargeIcon,
} from '@app/design-system';
import { BottomNavigation, type BottomNavigationItem } from '@app/design-system/web';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { appBridge, isNativeShell, markHandedOffToNativeTabs } from '@/shared/bridge/client';
import { emitMainTabGesture } from '@/shared/lib/navigation/mainTabGesture';
import { scrollPageToTop } from '@/shared/lib/navigation/scrollPageToTop';
import {
  MAIN_TAB_PATHS,
  MAIN_TABS,
  NATIVE_TAB_ITEMS,
  findMainTab,
  type MainTabId,
} from '../constants/tabs';

const ICONS: Record<MainTabId, { icon: ReactNode; selectedIcon: ReactNode }> = {
  feed: { icon: <LineHomeLargeIcon />, selectedIcon: <FillHomeLargeIcon /> },
  photos: { icon: <LinePhotoLargeIcon />, selectedIcon: <FillPhotoLargeIcon /> },
  bunch: { icon: <LineConfettiLargeIcon />, selectedIcon: <FillConfettiLargeIcon /> },
  my: { icon: <LineUserLargeIcon />, selectedIcon: <FillUserLargeIcon /> },
};

const items: BottomNavigationItem[] = MAIN_TABS.map(({ id, label }) => ({
  id,
  label,
  ...ICONS[id],
}));

const subscribeNone = () => () => {};

// 지금 탭을 이 시간 안에 두 번 다시 누르면 두 번 누르기(번치 탭은 최근 번치로 전환)
const DOUBLE_PRESS_MS = 300;
// 지금 탭을 이만큼 누르고 있으면 꾹 누르기(번치 탭은 전환 시트, iOS 기본 길게 누르기 시간). 손가락이 많이 움직이면 취소
const LONG_PRESS_MS = 500;
// 막대 끌기(탭 사이 훑기)가 시작되는 거리와 같게: 끌기가 포인터를 가져가기 전에 꾹 누르기를 끝냄
const LONG_PRESS_SLOP_PX = 6;
// 꾹 누른 뒤 손을 떼며 오는 click으로 볼 시간
const LONG_PRESS_CLICK_MS = 1000;
// 꾹 누르기가 있는 탭(그 탭 첫 화면에서만, 화면이 받아 처리)
const LONG_PRESS_TABS: ReadonlySet<MainTabId> = new Set(['bunch']);

/**
 * 탭 화면의 하단 내비게이션. 브라우저·안드로이드는 웹 막대, iOS 쉘은 시스템 탭 바를 써서 웹 막대 숨김
 * 근거: docs/decisions/records/012-ios-system-tab-bar.md
 */
export function MainTabBar() {
  const pathname = usePathname();
  const selectedId = findMainTab(pathname) ?? 'feed';
  // 서버 렌더링과 쉘 응답 전에는 막대 숨김(쉘에서 웹 막대가 잠깐 보였다 사라지는 것 방지)
  const inShell = useSyncExternalStore(subscribeNone, isNativeShell, () => true);
  const [usesNativeBar, setUsesNativeBar] = useState<boolean | null>(null);
  // 지금 탭 다시 누르기: 맨 위로, 짧은 간격의 두 번째면 그 탭 화면에 두 번 누르기를 알림(웹 막대·iOS 시스템 탭 바 공통)
  const lastReselect = useRef<{ tab: string; at: number }>(undefined);
  const reselect = usePreservedCallback((tab: string, countable = true) => {
    scrollPageToTop();
    // 키보드 클릭(Enter 누르고 있으면 반복)은 세지 않음: 키보드 사용자는 헤더 번치 이름으로 전환
    if (!countable) {
      lastReselect.current = undefined;
      return;
    }
    const now = performance.now();
    const last = lastReselect.current;
    if (last?.tab === tab && now - last.at < DOUBLE_PRESS_MS) {
      lastReselect.current = undefined;
      emitMainTabGesture({ tab, kind: 'doublePress' });
    } else {
      lastReselect.current = { tab, at: now };
    }
  });

  useEffect(() => {
    if (!inShell) return;
    appBridge
      .setNativeTabBar({ items: NATIVE_TAB_ITEMS, selectedId })
      .then((usesNative) => {
        if (usesNative) markHandedOffToNativeTabs();
        setUsesNativeBar(usesNative);
      })
      .catch(() => setUsesNativeBar(false));
  }, [inShell, selectedId]);

  // 꾹 누르기: 누르는 동안 타이머, 다 차서 화면이 처리하면 그 탭에 이어지는 click(이동·맨 위로)은 무시
  const press = useRef<{ x: number; y: number; timer: number }>(undefined);
  const longPressed = useRef<{ tab: string; at: number }>(undefined);
  const endPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = undefined;
  };
  useEffect(() => endPress, []);
  // 누르는 중 다른 화면으로 가면 취소
  useEffect(endPress, [pathname]);

  // 다른 탭을 거쳐 온 누름이 앞선 기록과 이어 세어지지 않게 탭이 바뀌면 비움
  // iOS 쉘은 탭마다 WebView라 selectedId가 그대로여서, 이 WebView가 가려질 때도 비움
  useEffect(() => {
    lastReselect.current = undefined;
    const clearWhenHidden = () => {
      if (document.visibilityState === 'hidden') lastReselect.current = undefined;
    };
    document.addEventListener('visibilitychange', clearWhenHidden);
    return () => document.removeEventListener('visibilitychange', clearWhenHidden);
  }, [selectedId]);

  // iOS 시스템 탭 바에서 보고 있는 탭을 다시 누름: 모든 탭 WebView에 오므로 보이는 내 탭만 맨 위로
  useEffect(() => {
    if (!inShell) return;
    return appBridge.addEventListener('nativeTabReselect', (event) => {
      if (event.tab === selectedId && document.visibilityState === 'visible') reselect(event.tab);
    });
  }, [inShell, selectedId, reselect]);

  // iOS 시스템 탭 바에서 보고 있는 탭을 꾹 누름(쉘 네이티브 제스처): 웹 막대와 같이 그 탭 첫 화면일 때만
  useEffect(() => {
    if (!inShell) return;
    return appBridge.addEventListener('nativeTabLongPress', (event) => {
      if (
        event.tab === selectedId &&
        LONG_PRESS_TABS.has(selectedId) &&
        pathname === MAIN_TAB_PATHS[selectedId] &&
        document.visibilityState === 'visible'
      )
        emitMainTabGesture({ tab: selectedId, kind: 'longPress' });
    });
  }, [inShell, selectedId, pathname]);

  // iOS 시스템 탭 바를 쓰면 웹 막대 대신 표식만 남겨 (main) 레이아웃·AppFrame이 본문을 탭 바 뒤까지 펼치게 함
  if (inShell && usesNativeBar === true) return <span hidden data-native-tab-bar="" />;
  if (inShell && usesNativeBar !== false) return null;

  return (
    <div
      data-main-tab-bar
      // toast()가 이 영역 위 16px에 토스트를 놓음. 막대를 숨기면(display: none) 크기가 0이라 기본 위치를 씀
      data-toast-anchor="tab-bar"
      // 높이 5rem(막대 64px + 아래 여백 16px) + 아래 Safe Area: 본문을 화면 끝까지 펼치고 막대가 Safe Area를 직접 비켜 섬((main)/layout.tsx의 --main-tab-bar-height와 같은 값)
      // 뒤 그라데이션(Figma 사진함_02): 막대 위 11px부터 화면 끝까지, 투명 → 검정 4%(64px) → 검정 10%
      // sheet가 내려가는 동안(data-sheet-moving)은 시트 아래로 내려 시트가 막대를 덮었다가 드러내게 함(막대가 시트 위로 먼저 튀어나오지 않게)
      className="px-padding-p8 pointer-events-none relative z-10 -mt-[calc(5rem+var(--safe-area-bottom))] h-[calc(5rem+var(--safe-area-bottom))] shrink-0 pb-[calc(var(--spacing-s4)+var(--safe-area-bottom))] group-has-data-hide-main-tab-bar/main:hidden group-has-data-sheet-moving/app-frame:z-0 before:absolute before:inset-x-0 before:-top-2.75 before:bottom-0 before:-z-10 before:bg-[linear-gradient(to_bottom,rgb(255_255_255/0),rgb(0_0_0/0.04)_64px,rgb(0_0_0/0.1))]"
    >
      <BottomNavigation
        className="pointer-events-auto"
        aria-label="주요 메뉴"
        items={items}
        selectedId={selectedId}
        renderItem={(item, state) => {
          const tabId = item.id as MainTabId;
          const longPressable = LONG_PRESS_TABS.has(tabId) && pathname === MAIN_TAB_PATHS[tabId];
          return (
            <Link
              href={MAIN_TAB_PATHS[item.id as MainTabId]}
              className={state.className}
              aria-current={state['aria-current']}
              onPointerDown={(event) => {
                endPress();
                // 새 누름이 시작되면 앞선 꾹 누르기 기록은 끝(click이 생략된 브라우저에서 다음 탭·문맥 메뉴를 막지 않게)
                longPressed.current = undefined;
                if (!longPressable || !event.isPrimary || event.button !== 0) return;
                press.current = {
                  x: event.clientX,
                  y: event.clientY,
                  timer: window.setTimeout(() => {
                    press.current = undefined;
                    // 화면이 받는 중·오류라 처리하지 않았으면 평소 click(맨 위로)을 그대로 둠
                    if (!emitMainTabGesture({ tab: tabId, kind: 'longPress' })) return;
                    longPressed.current = { tab: tabId, at: performance.now() };
                    if (inShell) void appBridge.tabSelectionHaptic().catch(() => {});
                  }, LONG_PRESS_MS),
                };
              }}
              onPointerMove={(event) => {
                const start = press.current;
                if (
                  start &&
                  Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_SLOP_PX
                )
                  endPress();
              }}
              onPointerUp={endPress}
              onPointerCancel={endPress}
              onPointerLeave={endPress}
              // 안드로이드 Chrome은 길게 누르면 문맥 메뉴(링크 열기 등)를 띄워 누르는 중·꾹 누른 직후만 막음(오른쪽 클릭 메뉴는 그대로)
              onContextMenu={(event) => {
                if (press.current || longPressed.current?.tab === tabId) event.preventDefault();
              }}
              onClick={(event) => {
                // 꾹 누른 그 탭에서 손을 떼며 오는 click만 무시(click이 생략되는 브라우저에서 다음 누름을 먹지 않게)
                const pressed = longPressed.current;
                longPressed.current = undefined;
                if (
                  pressed?.tab === tabId &&
                  event.detail > 0 &&
                  performance.now() - pressed.at < LONG_PRESS_CLICK_MS
                ) {
                  event.preventDefault();
                  return;
                }
                // 탭을 누를 때마다 선택 햅틱(지금 탭 포함, iOS 시스템 탭 바와 같은 기준). 메서드가 없는 이전 쉘은 브라우저 폴백(동작 없음)
                if (inShell) void appBridge.tabSelectionHaptic().catch(() => {});
                // 지금 탭의 첫 화면에서 다시 누르면 이동 대신 맨 위로(하위 화면이면 첫 화면으로 이동)
                const plainClick =
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey;
                // 보조 키 클릭(새 탭 열기 등)은 링크 기본 동작 그대로
                if (plainClick && pathname === MAIN_TAB_PATHS[item.id as MainTabId]) {
                  event.preventDefault();
                  // 포인터 클릭은 detail이 1 이상, 키보드 클릭은 0
                  reselect(item.id, event.detail > 0);
                }
              }}
            >
              {state.children}
            </Link>
          );
        }}
      />
    </div>
  );
}

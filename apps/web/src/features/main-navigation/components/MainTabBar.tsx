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
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { appBridge, isNativeShell, markHandedOffToNativeTabs } from '@/shared/bridge/client';
import { scrollPageToTop } from '@/shared/lib/scrollPageToTop';
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

  // iOS 시스템 탭 바에서 보고 있는 탭을 다시 누름: 모든 탭 WebView에 오므로 보이는 내 탭만 맨 위로
  useEffect(() => {
    if (!inShell) return;
    return appBridge.addEventListener('nativeTabReselect', (event) => {
      if (event.tab === selectedId && document.visibilityState === 'visible') scrollPageToTop();
    });
  }, [inShell, selectedId]);

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
      className="px-padding-p8 pointer-events-none relative z-10 -mt-[calc(5rem+var(--safe-area-bottom))] h-[calc(5rem+var(--safe-area-bottom))] shrink-0 pb-[calc(var(--spacing-s4)+var(--safe-area-bottom))] group-has-data-hide-main-tab-bar/main:hidden before:absolute before:inset-x-0 before:-top-2.75 before:bottom-0 before:-z-10 before:bg-[linear-gradient(to_bottom,rgb(255_255_255/0),rgb(0_0_0/0.04)_64px,rgb(0_0_0/0.1))]"
    >
      <BottomNavigation
        className="pointer-events-auto"
        aria-label="주요 메뉴"
        items={items}
        selectedId={selectedId}
        renderItem={(item, state) => (
          <Link
            href={MAIN_TAB_PATHS[item.id as MainTabId]}
            className={state.className}
            aria-current={state['aria-current']}
            // 탭을 누를 때마다 선택 햅틱(지금 탭 포함, iOS 시스템 탭 바와 같은 기준). 메서드가 없는 이전 쉘은 브라우저 폴백(동작 없음)
            onClick={(event) => {
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
                scrollPageToTop();
              }
            }}
          >
            {state.children}
          </Link>
        )}
      />
    </div>
  );
}

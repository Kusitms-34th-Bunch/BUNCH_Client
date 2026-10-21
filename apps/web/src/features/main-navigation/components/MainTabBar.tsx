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
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { MAIN_TAB_PATHS, MAIN_TABS, findMainTab, type MainTabId } from '../constants/tabs';

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

const nativeItems = MAIN_TABS.map((tab) => ({ ...tab, path: MAIN_TAB_PATHS[tab.id] }));

const subscribeNone = () => () => {};

/**
 * 탭 화면의 하단 내비게이션. iOS 쉘은 시스템 탭 바를 그리므로(탭마다 WebView) 웹 막대를 숨기고,
 * 브라우저·안드로이드는 웹 막대를 그린다(docs/decisions/records/012-ios-system-tab-bar.md)
 */
export function MainTabBar() {
  const pathname = usePathname();
  const selectedId = findMainTab(pathname) ?? 'feed';
  // 서버는 쉘 여부를 몰라 막대를 숨긴 채 그리고, 쉘 안에서는 응답 전까지 숨겨 웹 막대가 잠깐 보였다 사라지지 않게 한다
  const inShell = useSyncExternalStore(subscribeNone, isNativeShell, () => true);
  const [usesNativeBar, setUsesNativeBar] = useState<boolean | null>(null);

  useEffect(() => {
    if (!inShell) return;
    appBridge
      .setNativeTabBar({ items: nativeItems, selectedId })
      .then(setUsesNativeBar)
      .catch(() => setUsesNativeBar(false));
  }, [inShell, selectedId]);

  if (inShell && usesNativeBar !== false) return null;

  return (
    <div className="px-padding-p8 pb-s4 shrink-0">
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId={selectedId}
        renderItem={(item, state) => (
          <Link
            href={MAIN_TAB_PATHS[item.id as MainTabId]}
            className={state.className}
            aria-current={state['aria-current']}
          >
            {state.children}
          </Link>
        )}
      />
    </div>
  );
}

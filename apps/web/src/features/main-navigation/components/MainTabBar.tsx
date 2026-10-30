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
      .setNativeTabBar({ items: nativeItems, selectedId })
      .then(setUsesNativeBar)
      .catch(() => setUsesNativeBar(false));
  }, [inShell, selectedId]);

  if (inShell && usesNativeBar !== false) return null;

  return (
    <div
      data-main-tab-bar
      // 높이 5rem(h-20, -mt-20: 막대 64px + 아래 여백 16px)은 (main)/layout.tsx의 --main-tab-bar-height와 같은 값
      // 뒤 그라데이션(Figma 사진함_02): 막대 위 11px부터 Safe Area까지, 투명 → 검정 4%(64px) → 검정 10%
      className="px-padding-p8 pb-s4 pointer-events-none relative z-10 -mt-20 h-20 shrink-0 group-has-data-[hide-main-tab-bar]/main:hidden before:absolute before:inset-x-0 before:-top-[11px] before:-bottom-(--safe-area-bottom) before:-z-10 before:bg-[linear-gradient(to_bottom,rgb(255_255_255/0),rgb(0_0_0/0.04)_64px,rgb(0_0_0/0.1))]"
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
          >
            {state.children}
          </Link>
        )}
      />
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { useModalOpen } from '@/shared/hooks/useModalOpen';
import { MAIN_TAB_PATHS } from '../constants/tabs';

// 판정 기준은 (main) route group이 아니라 탭 경로 4개와 정확히 같은지. (main) 안에 하위 경로를 추가하면 함께 수정
const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);

// 선택 모드처럼 탭 이동을 막는 화면(HideMainTabBar)도 웹 막대와 같이 숨김
const HIDE_TAB_BAR_SELECTOR = '[data-hide-main-tab-bar]';

/**
 * iOS 쉘의 시스템 탭 바 표시 상태를 현재 경로에 맞춤(결정 기록 012). 탭 화면이면 표시, 탭 밖(상세·온보딩)이거나 시트·대화상자가 열려 있으면 숨김
 * 탭 WebView 4개가 쉘을 공유하므로 화면에 보이는 WebView만 보내고, 다시 보이게 되면 현재 상태를 다시 보냄
 * 경로마다 지금 값을 보내 직접 진입·새로고침에도 맞음. 브라우저·안드로이드·탭 화면이 아니면 쉘이 무시
 */
export function NativeTabBarVisibility() {
  const pathname = usePathname();
  const modalOpen = useModalOpen(HIDE_TAB_BAR_SELECTOR);

  useEffect(() => {
    if (!isNativeShell()) return;
    const visible = tabPaths.includes(pathname) && !modalOpen;
    const send = () => {
      if (document.visibilityState !== 'visible') return;
      void appBridge.setNativeTabBarVisible(visible).catch(() => {});
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [pathname, modalOpen]);

  return null;
}

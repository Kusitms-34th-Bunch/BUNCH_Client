'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { appBridge, hasNativeMethod, isNativeShell, nativeShellTab } from '@/shared/bridge/client';
import { useModalOpen } from '@/shared/hooks/useModalOpen';
import { MAIN_TAB_PATHS, NATIVE_TAB_ITEMS } from '../constants/tabs';

// 판정 기준은 (main) route group이 아니라 탭 경로 4개와 정확히 같은지. (main) 안에 하위 경로를 추가하면 함께 수정
const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);

// 선택 모드처럼 탭 이동을 막는 화면(HideMainTabBar)도 웹 막대와 같이 숨김
const HIDE_TAB_BAR_SELECTOR = '[data-hide-main-tab-bar]';

/**
 * iOS 쉘의 시스템 탭 바 표시 상태를 현재 경로에 맞춤(결정 기록 012). 탭 화면이면 표시, 탭 밖(상세·온보딩)이거나 시트·대화상자가 열려 있으면 숨김
 * 탭 WebView는 자기 탭 값으로 보내 쉘이 선택된 탭의 값만 적용함. 이전 쉘에서는 화면에 보이는 WebView만 보내고 다시 보이면 다시 보냄
 * 경로마다 지금 값을 보내 직접 진입·새로고침에도 맞음. 브라우저·안드로이드·탭 화면이 아니면 쉘이 무시
 * `exitPaths`(로그인 전 화면)에 오면 탭 화면을 끝내고 첫 화면의 WebView 하나로 돌아감(`hidden: true`)
 * 로그아웃·탈퇴 뒤 로그인부터 온보딩까지 탭 WebView 안에서 이어지면, 온보딩을 마치고 탭 경로로 가도 쉘이 그 탭을 고르지 않음
 */
export function NativeTabBarVisibility({ exitPaths = [] }: { exitPaths?: readonly string[] }) {
  const pathname = usePathname();
  const modalOpen = useModalOpen(HIDE_TAB_BAR_SELECTOR);
  const exiting = exitPaths.includes(pathname);

  useEffect(() => {
    if (!isNativeShell() || !exiting) return;
    // 요청에 보낸 WebView 구분이 없어 화면에 보이는 WebView만 보냄: 뒤의 탭 WebView가 로그인 전 화면에 와도 보던 탭 화면을 닫지 않고,
    // 그 탭이 보이게 되면 그때 보냄(탭 바 표시와 같은 방식)
    // 탭 화면이 아니면(첫 화면 WebView) 쉘이 그대로 둠. 선택 탭은 쉘이 쓰지 않지만 요청 형식상 넣음
    const send = () => {
      if (document.visibilityState !== 'visible') return;
      void appBridge
        .setNativeTabBar({ items: NATIVE_TAB_ITEMS, selectedId: 'feed', hidden: true })
        .catch(() => {});
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [exiting]);

  useEffect(() => {
    if (!isNativeShell() || exiting) return;
    const visible = tabPaths.includes(pathname) && !modalOpen;
    // 탭 WebView는 자기 탭 ID와 함께 늘 보냄(쉘이 탭마다 저장하고 선택된 탭의 값만 적용, #481)
    // 첫 화면 WebView·이 메서드가 없는 이전 쉘은 화면에 보이는 WebView만 보냄
    const tab = nativeShellTab();
    const perTab = tab !== null && hasNativeMethod('setNativeTabBarVisibleFor');
    if (perTab) {
      void appBridge.setNativeTabBarVisibleFor({ tab, visible }).catch(() => {});
      return;
    }
    const send = () => {
      if (document.visibilityState !== 'visible') return;
      void appBridge.setNativeTabBarVisible(visible).catch(() => {});
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [pathname, modalOpen, exiting]);

  return null;
}

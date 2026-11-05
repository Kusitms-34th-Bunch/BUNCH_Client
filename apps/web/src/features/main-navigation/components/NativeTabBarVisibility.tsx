'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { MAIN_TAB_PATHS } from '../constants/tabs';

// 판정 기준은 (main) route group이 아니라 탭 경로 4개와 정확히 같은지. (main) 안에 하위 경로를 추가하면 함께 수정
const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);

// 바텀시트·대화상자(Base UI)는 열린 동안만 role이 dialog·alertdialog인 요소를 그림
// 닫힘 애니메이션 중(data-ending-style)은 닫힌 것으로 봐 시트가 내려가기 시작할 때 탭 바를 바로 다시 보임
const MODAL_SELECTOR =
  '[role="dialog"]:not([data-ending-style]), [role="alertdialog"]:not([data-ending-style])';
// 선택 모드처럼 탭 이동을 막는 화면(HideMainTabBar)도 웹 막대와 같이 숨김
const hasOpenModal = () =>
  document.querySelector(`${MODAL_SELECTOR}, [data-hide-main-tab-bar]`) !== null;

/** 모달이 열려 있는지 DOM 변화로 추적(시스템 탭 바는 WebView 위의 네이티브 화면이라 웹 시트를 가림) */
function useModalOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // 결과는 쉘에서만 쓰여 일반 브라우저에서는 DOM 관찰 생략
    if (!isNativeShell()) return;
    const update = () => setOpen(hasOpenModal());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ending-style'],
    });
    return () => observer.disconnect();
  }, []);
  return open;
}

/**
 * iOS 쉘의 시스템 탭 바 표시 상태를 현재 경로에 맞춤(결정 기록 012). 탭 화면이면 표시, 탭 밖(상세·온보딩)이거나 시트·대화상자가 열려 있으면 숨김
 * 탭 WebView 4개가 쉘을 공유하므로 화면에 보이는 WebView만 보내고, 다시 보이게 되면 현재 상태를 다시 보냄
 * 경로마다 지금 값을 보내 직접 진입·새로고침에도 맞음. 브라우저·안드로이드·탭 화면이 아니면 쉘이 무시
 */
export function NativeTabBarVisibility() {
  const pathname = usePathname();
  const modalOpen = useModalOpen();

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

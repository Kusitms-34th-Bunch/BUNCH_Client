'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { appBridge, hasNativeMethod, isNativeShell, nativeShellTab } from '@/shared/bridge/client';
import { useModalOpen } from '@/shared/hooks/overlay/useModalOpen';
import { MAIN_TAB_PATHS, NATIVE_TAB_ITEMS } from '../constants/tabs';

// 판정 기준은 (main) route group이 아니라 탭 경로 4개와 정확히 같은지. (main) 안에 하위 경로를 추가하면 함께 수정
const tabPaths: readonly string[] = Object.values(MAIN_TAB_PATHS);

// 선택 모드처럼 탭 이동을 막는 화면(HideMainTabBar)도 웹 막대와 같이 숨김
const HIDE_TAB_BAR_SELECTOR = '[data-hide-main-tab-bar]';
// 탭 바 자리를 가릴 수 있는 것: 움직이는 화면 sheet(AppTransitions guardSheet), 전환 중 나가는 화면, 닫히는 중인 바텀시트·대화상자
const COVER_SELECTOR =
  '[data-sheet-moving], [data-page-leaving], [role="dialog"][data-ending-style], [role="alertdialog"][data-ending-style]';
// 기다리는 최대 시간(멈춘 전환·남은 표식에도 탭 바가 영영 숨지 않게)
const COVER_WAIT_MS = 1000;
// 탭 바 자리(화면 아래 15%)를 이 비율 넘게 덮는 것이 있으면 기다림
const TAB_BAR_ZONE_RATIO = 0.15;
const COVER_THRESHOLD = 0.2;
// 흐려지기 시작한 나가는 화면은 덮지 않은 것으로 봄(상세에서 돌아오는 hero는 제자리에서 흐려지기만 함, #532)
// 절반(0.5)까지 기다리면 뒤 화면이 비치기 시작하고 약 140ms 뒤에 나와 늦어 보였음(CPU 4배 측정, #568)
const FADED_OPACITY = 0.95;

/** 조상까지 곱한 실제 투명도(값이 없으면 1) */
const visibleOpacity = (element: Element) => {
  let opacity = 1;
  for (
    let node: Element | null = element;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const value = Number.parseFloat(getComputedStyle(node).opacity);
    if (!Number.isNaN(value)) opacity *= value;
  }
  return opacity;
};

/**
 * 시스템 탭 바는 웹 위에 그려져 웹 화면 아래로 내릴 수 없어, 다시 보일 때 그 자리를 덮던 것이 비켜난 뒤에 보임
 * (스프링·전환이 다 끝나기를 기다리지 않고 실제 위치·투명도로 판단)
 */
const somethingCoversTabBar = () => {
  const zoneTop = window.innerHeight * (1 - TAB_BAR_ZONE_RATIO);
  const zoneArea = window.innerWidth * (window.innerHeight - zoneTop);
  if (zoneArea <= 0) return false;
  return [...document.querySelectorAll(COVER_SELECTOR)].some((element) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, zoneTop);
    return (
      width > 0 &&
      height > 0 &&
      (width * height) / zoneArea > COVER_THRESHOLD &&
      // 바텀시트는 내려가며 함께 흐려져 반쯤 남은 채 투명도가 먼저 떨어지므로 나가는 화면에만 적용
      !(element.hasAttribute('data-page-leaving') && visibleOpacity(element) <= FADED_OPACITY)
    );
  });
};

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
    const send = () => {
      if (perTab) {
        void appBridge.setNativeTabBarVisibleFor({ tab, visible }).catch(() => {});
        return;
      }
      if (document.visibilityState !== 'visible') return;
      void appBridge.setNativeTabBarVisible(visible).catch(() => {});
    };
    // 다시 보일 때는 탭 바 자리를 덮던 시트·나가는 화면·닫히는 바텀시트가 비켜난 뒤에(최대 1초)
    const startedAt = performance.now();
    let frame = 0;
    const sendWhenSettled = () => {
      if (visible && somethingCoversTabBar() && performance.now() - startedAt < COVER_WAIT_MS) {
        frame = requestAnimationFrame(sendWhenSettled);
        return;
      }
      send();
    };
    // 보일 때는 전환이 시작될(표식이 붙을) 한 프레임 뒤부터 확인. 숨길 때와 보이지 않는 WebView(프레임이 멈춤)는 바로
    if (visible && document.visibilityState === 'visible')
      frame = requestAnimationFrame(sendWhenSettled);
    else send();
    if (perTab) return () => cancelAnimationFrame(frame);
    document.addEventListener('visibilitychange', send);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', send);
    };
  }, [pathname, modalOpen, exiting]);

  return null;
}

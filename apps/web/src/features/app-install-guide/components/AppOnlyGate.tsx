'use client';

import { type ReactNode, useSyncExternalStore } from 'react';
import { isNativeShell } from '@/shared/bridge/client';

const subscribeNothing = () => () => {};
const unknownOnServer = () => null;
// 로컬 개발 서버와 가짜 서버 빌드(E2E·UT)는 브라우저에서도 열어 둠
const openOutsideShell = () =>
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

type AppOnlyGateProps = {
  /** 앱 밖(브라우저)에서 대신 보여 줄 화면 */
  fallback: ReactNode;
  children: ReactNode;
};

/**
 * 앱 화면은 쉘 안에서만, 브라우저에서는 `fallback`(설치 안내)(서버·hydration 동안은 `children` 유지)
 * 이전 쉘 빌드도 열리게 User-Agent가 아니라 쉘이 주입하는 WebView 객체로 판단
 */
export function AppOnlyGate({ fallback, children }: AppOnlyGateProps) {
  const inShell = useSyncExternalStore(subscribeNothing, isNativeShell, unknownOnServer);
  if (openOutsideShell() || inShell !== false) return children;
  return fallback;
}

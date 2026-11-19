'use client';

import { useNativeTabSync } from '@/shared/query/nativeTabSync';

/** iOS 쉘 탭 WebView 사이의 내 정보(지금 번치·프로필) 변화 맞춤(`useNativeTabSync`). 앱 레이아웃에 한 번 둠 */
export function NativeTabSync() {
  useNativeTabSync();
  return null;
}

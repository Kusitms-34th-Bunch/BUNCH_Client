import type { HapticKind } from '@app/bridge';
import { appBridge, isNativeShell } from '@/shared/bridge/client';

/**
 * 앱 쉘에서 보이는 WebView일 때만 햅틱을 울림(숨은 탭 WebView가 다시 그려지며 울리지 않게). 실패는 무시
 * 브라우저·이전 쉘에서는 동작 없음
 */
export const playHaptic = (kind: HapticKind) => {
  if (!isNativeShell() || document.visibilityState !== 'visible') return;
  void appBridge.feedbackHaptic(kind).catch(() => {});
};

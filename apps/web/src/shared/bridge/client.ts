import type { AppBridge, AppPostMessageSchema, ShareParams } from '@app/bridge';
import { linkBridge } from '@webview-bridge/web';

/** 일반 브라우저용 폴백 제공, 메서드 추가 시 packages/bridge 계약과 함께 갱신 필요 */
export const appBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  initialBridge: {
    share: async ({ url, title }: ShareParams) => {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(title ? { url, title } : { url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    },
    // 브라우저는 `navigator.clipboard`(보안 컨텍스트 필요)로 대체. 쉘에서는 쉘이 이 메서드를 구현
    copyToClipboard: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    },
    readClipboard: async () => {
      try {
        return (await navigator.clipboard.readText()).trim() || null;
      } catch {
        return null;
      }
    },
    // 브라우저에는 시스템 권한 팝업 없음. 호출부에서 먼저 isNativeShell()로 확인 필요
    requestPermission: () => Promise.resolve('undetermined'),
    // 브라우저에는 소셜 로그인 SDK 없음. 쉘에서만 로그인할 수 있어 호출부가 실패로 처리
    socialLogin: () => Promise.reject(new Error('네이티브 쉘에서만 소셜 로그인을 할 수 있어요.')),
    // 브라우저에서는 웹 탭 막대 사용
    setNativeTabBar: () => Promise.resolve(false),
    // 브라우저에는 햅틱 없음
    tabSelectionHaptic: () => Promise.resolve(),
    // 브라우저에는 시스템 탭 바 없음
    setNativeTabBarVisible: () => Promise.resolve(false),
    // 브라우저에는 앱 스플래시 없음
    appReady: () => Promise.resolve(),
  },
});

/** initialBridge 지원 여부와 별개로 실제 네이티브 호스트 확인 */
export const isNativeShell = () => typeof window !== 'undefined' && 'ReactNativeWebView' in window;

/** 사용자 선택 대기 중에는 타임아웃 없이 갤러리 응답 대기, 기존 브리지의 대기 정책 유지 */
export const galleryBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['pickGalleryImage'],
});

/** 소셜 로그인 창은 사용자가 끝낼 때까지 기다려야 하므로 타임아웃 없음, SDK 오류는 reject로 전달 */
export const loginBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['socialLogin'],
});

/** 시스템 권한 팝업은 사용자가 응답할 때까지 기다려야 하므로 타임아웃 없음 */
export const permissionBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['requestPermission'],
});

/** 클립보드 읽기 전용: iOS는 사용자가 붙여넣기를 허용할 때까지 기다리므로 타임아웃 없음(복사는 기본 `appBridge`의 타임아웃을 씀) */
export const clipboardBridge = linkBridge<AppBridge, AppPostMessageSchema>({ timeout: 0 });

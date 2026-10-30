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
    // 브라우저에는 시스템 권한 팝업 없음. 호출부에서 먼저 isNativeShell()로 확인 필요
    requestPermission: () => Promise.resolve('undetermined'),
    // 브라우저에서는 웹 탭 막대 사용
    setNativeTabBar: () => Promise.resolve(false),
  },
});

/** initialBridge 지원 여부와 별개로 실제 네이티브 호스트 확인 */
export const isNativeShell = () => typeof window !== 'undefined' && 'ReactNativeWebView' in window;

/** 사용자 선택 대기 중에는 타임아웃 없이 갤러리 응답 대기, 기존 브리지의 대기 정책 유지 */
export const galleryBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['pickGalleryImage'],
});

/** 시스템 권한 팝업은 사용자가 응답할 때까지 기다려야 하므로 타임아웃 없음 */
export const permissionBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['requestPermission'],
});

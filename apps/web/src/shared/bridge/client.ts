import type { AppBridge, ShareParams } from '@app/bridge';
import { linkBridge } from '@webview-bridge/web';

/**
 * apps/mobile-shell의 WebView 안에서 실행될 때는 네이티브 `share`를 호출하고,
 * 일반 브라우저(WebView 밖)에서는 `initialBridge`의 Web Share API 폴백을 쓴다.
 * 새 bridge 메서드를 추가하면 packages/bridge의 AppBridge와 여기 initialBridge를
 * 함께 갱신한다.
 */
export const appBridge = linkBridge<AppBridge>({
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
  },
});

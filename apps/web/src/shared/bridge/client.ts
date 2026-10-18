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
    // 브라우저에서는 웹 탭 막대 사용
    setNativeTabBar: () => Promise.resolve(false),
  },
});

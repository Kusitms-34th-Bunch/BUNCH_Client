import type { BridgeStore } from '@webview-bridge/types';
import type { ShareParams } from './schema';

export { shareParamsSchema } from './schema';
export type { ShareParams } from './schema';

/**
 * apps/mobile-shell(네이티브 구현)과 apps/web(호출부)이 공유하는 bridge 메서드 계약이다.
 * 네이티브 메서드를 추가하면 여기에 시그니처를 추가하고, mobile-shell의 실제
 * `bridge({...})` 구현과 타입이 어긋나지 않는지 양쪽 typecheck로 확인한다.
 */
export type AppBridgeMethods = {
  /** 네이티브 공유 시트를 연다. WebView 밖(순수 브라우저)에서는 폴백으로 Web Share API를 쓴다. */
  share: (_params: ShareParams) => Promise<void>;
};

/**
 * `@webview-bridge`의 `bridge()`/`linkBridge()`는 평범한 메서드 객체가 아니라
 * zustand 스타일 store(getState/setState/subscribe)를 기대한다. `AppBridgeMethods`를
 * 직접 넘기면 index signature 불일치로 타입 에러가 난다 — 항상 `AppBridge`를 쓴다.
 */
export type AppBridge = BridgeStore<AppBridgeMethods>;

import { afterEach, expect, it, vi } from 'vitest';
import { appBridge, galleryBridge, isNativeShell } from './client';

afterEach(() => vi.unstubAllGlobals());

it('웹 fallback 메서드가 있어도 일반 브라우저를 네이티브로 판단하지 않는다', () => {
  expect(appBridge.isWebViewBridgeAvailable).toBe(true);
  expect(isNativeShell()).toBe(false);
  expect(galleryBridge.isNativeMethodAvailable('pickGalleryImage')).toBe(false);
});

it('실제 ReactNativeWebView 호스트가 있을 때만 네이티브로 판단한다', () => {
  vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
  expect(isNativeShell()).toBe(true);
});

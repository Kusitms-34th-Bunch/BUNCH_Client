import { afterEach, describe, expect, it, vi } from 'vitest';
import { appBridge, galleryBridge, isNativeShell, openTabPath } from './client';

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

describe('openTabPath', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('브라우저면 주소로 이동한다', async () => {
    const push = vi.fn();
    openTabPath('/bunch', push);
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/bunch'));
  });

  it('iOS 쉘의 다른 탭이면 그 탭으로 전환하고 주소는 그대로 둔다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'feed');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(true);
    const push = vi.fn();

    openTabPath('/bunch', push);

    await vi.waitFor(() => expect(select).toHaveBeenCalledWith('bunch'));
    expect(push).not.toHaveBeenCalled();
  });

  it('지금 탭·탭 첫 화면이 아닌 경로·전환 실패(이전 쉘)는 주소로 이동한다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'bunch');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(false);
    const push = vi.fn();

    openTabPath('/bunch', push);
    openTabPath('/bunch/members', push);
    sessionStorage.setItem('bunch-shell-tab', 'feed');
    openTabPath('/bunch', push);

    await vi.waitFor(() => expect(push).toHaveBeenCalledTimes(3));
    expect(select).toHaveBeenCalledTimes(1);
  });
});

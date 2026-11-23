import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPendingToast, settlePendingToast } from '@/shared/lib/toastAfterNavigation';
import { appBridge, galleryBridge, isNativeShell, openTabPath, replaceTabPath } from './client';

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

describe('replaceTabPath', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    settlePendingToast(false);
  });

  it('브라우저면 그 주소로 바꾼다', async () => {
    const replace = vi.fn();
    replaceTabPath('/feed', replace);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/feed'));
  });

  it('iOS 쉘의 다른 탭에서 흐름을 마치면 그 탭으로 전환하고, 지금 WebView는 자기 탭 첫 화면으로 되돌린다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'bunch');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(true);
    const replace = vi.fn();

    replaceTabPath('/feed', replace);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    expect(select).toHaveBeenCalledWith('feed');
  });

  it('안내가 있는데 쉘 토스트가 없는 이전 쉘이면 전환하지 않고 이 WebView에서 이동한 뒤 웹 토스트로 알린다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'bunch');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(true);
    const replace = vi.fn();

    replaceTabPath('/feed', replace, { toast: '이미 참여 중인 번치예요.' });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/feed'));
    expect(select).not.toHaveBeenCalled();
    expect(getPendingToast()?.message).toBe('이미 참여 중인 번치예요.');
  });

  it('쉘 탭 ID를 알 수 없거나 전환 요청이 실패하면 그 주소로 바꾼다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'unknown');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(true);
    const replace = vi.fn();

    replaceTabPath('/feed', replace);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/feed'));

    select.mockRejectedValue(new Error('timeout'));
    sessionStorage.setItem('bunch-shell-tab', 'bunch');
    replaceTabPath('/feed', replace);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(2));
    expect(replace).toHaveBeenLastCalledWith('/feed');
  });

  it('같은 탭이거나 전환하지 못하면(첫 화면 WebView·이전 쉘) 그 주소로 바꾼다', async () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    sessionStorage.setItem('bunch-shell-tab', 'feed');
    const select = vi.spyOn(appBridge, 'selectNativeTab').mockResolvedValue(false);
    const replace = vi.fn();

    replaceTabPath('/feed', replace);
    sessionStorage.removeItem('bunch-shell-tab');
    replaceTabPath('/feed', replace);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(2));
    expect(replace).toHaveBeenNthCalledWith(1, '/feed');
    expect(replace).toHaveBeenNthCalledWith(2, '/feed');
    expect(select).toHaveBeenCalledTimes(1);
  });
});

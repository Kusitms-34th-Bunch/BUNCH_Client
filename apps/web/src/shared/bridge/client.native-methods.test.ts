import { afterEach, describe, expect, it, vi } from 'vitest';

type BridgeWindow = Window & { ReactNativeWebView?: unknown; __bridgeMethods__?: string[] };

afterEach(() => {
  const w = window as BridgeWindow;
  delete w.ReactNativeWebView;
  delete w.__bridgeMethods__;
  vi.resetModules();
});

// 쉘이 주입하는 메서드 목록으로 bridge를 만들기 위해 매번 새로 불러옴
const loadClient = async (shellMethods: string[]) => {
  const w = window as BridgeWindow;
  w.ReactNativeWebView = { postMessage: () => {} };
  w.__bridgeMethods__ = shellMethods;
  return import('./client');
};

describe('hasNativeMethod', () => {
  it('쉘이 구현한 메서드만 있다고 답하고, initialBridge 폴백 이름은 세지 않는다', async () => {
    // 이전 쉘: 탭별 탭 바 메서드가 없음
    const client = await loadClient(['setNativeTabBarVisible']);

    expect(client.hasNativeMethod('setNativeTabBarVisible')).toBe(true);
    expect(client.hasNativeMethod('setNativeTabBarVisibleFor')).toBe(false);
    // 폴백이 있는 appBridge는 이전 쉘에서도 있다고 답함(그래서 쓰지 않음)
    expect(client.appBridge.isNativeMethodAvailable('setNativeTabBarVisibleFor')).toBe(true);
  });

  it('새 쉘이 구현한 탭별 메서드는 있다고 답한다', async () => {
    const client = await loadClient(['setNativeTabBarVisible', 'setNativeTabBarVisibleFor']);

    expect(client.hasNativeMethod('setNativeTabBarVisibleFor')).toBe(true);
  });
});

describe('replaceTabPath(쉘 토스트가 있는 쉘)', () => {
  it('다른 탭으로 전환하면 결과 안내를 그 탭의 쉘 토스트로 보내고, 이 WebView는 자기 탭 첫 화면으로 되돌린다', async () => {
    const client = await loadClient(['showNativeToast']);
    const postMessage = vi.fn();
    (window as BridgeWindow).ReactNativeWebView = { postMessage };
    sessionStorage.setItem('bunch-shell-tab', 'bunch');
    // 탭 전환은 폴백 메서드라 결과만 바꿔 끼움
    vi.spyOn(client.appBridge, 'selectNativeTab').mockResolvedValue(true);
    const replace = vi.fn();

    client.replaceTabPath('/feed', replace, { toast: '이미 참여 중인 번치예요.' });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    const sent = postMessage.mock.calls.map(([message]) => String(message)).join('\n');
    expect(sent).toContain('showNativeToast');
    expect(sent).toContain('이미 참여 중인 번치예요.');
    sessionStorage.clear();
  });
});

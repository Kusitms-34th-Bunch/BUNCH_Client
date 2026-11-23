import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onMainTabGesture } from '@/shared/lib/navigation/mainTabGesture';
import { MainTabBar } from './MainTabBar';

// iOS 쉘: 시스템 탭 바가 보낸 다시 누름·꾹 누름을 웹 막대와 같은 제스처로 바꾸는지
const route = vi.hoisted(() => ({ pathname: '/bunch' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

type ShellEvent = { tab: string };
const listeners = vi.hoisted(() => new Map<string, (_event: ShellEvent) => void>());
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  markHandedOffToNativeTabs: () => {},
  appBridge: {
    setNativeTabBar: () => Promise.resolve(true),
    tabSelectionHaptic: () => Promise.resolve(),
    addEventListener: (name: string, listener: (_event: ShellEvent) => void) => {
      listeners.set(name, listener);
      return () => listeners.delete(name);
    },
  },
}));

const send = (name: string, tab: string) => act(() => listeners.get(name)?.({ tab }));

const renderBar = (pathname: string) => {
  route.pathname = pathname;
  const gestures: unknown[] = [];
  const unsubscribe = onMainTabGesture((gesture) => {
    gestures.push(gesture);
    return true;
  });
  render(<MainTabBar />);
  return { gestures, unsubscribe };
};

describe('MainTabBar(iOS 쉘)', () => {
  afterEach(() => {
    listeners.clear();
    vi.restoreAllMocks();
  });

  it('시스템 탭 바에서 번치 탭을 꾹 누르면 번치 탭 화면에 꾹 누르기를 알린다', () => {
    const { gestures, unsubscribe } = renderBar('/bunch');
    try {
      send('nativeTabLongPress', 'bunch');
      expect(gestures).toEqual([{ tab: 'bunch', kind: 'longPress' }]);
    } finally {
      unsubscribe();
    }
  });

  it('다른 탭 WebView이거나 꾹 누르기가 없는 탭이면 알리지 않는다', () => {
    const { gestures, unsubscribe } = renderBar('/feed');
    try {
      // 모든 탭 WebView에 오므로 피드 WebView는 번치 탭 신호를 무시
      send('nativeTabLongPress', 'bunch');
      send('nativeTabLongPress', 'feed');
      expect(gestures).toEqual([]);
    } finally {
      unsubscribe();
    }
  });

  it('시스템 탭 바에서 짧은 간격으로 두 번 다시 누르면 두 번 누르기를 알린다', () => {
    const now = vi.spyOn(performance, 'now');
    const { gestures, unsubscribe } = renderBar('/bunch');
    try {
      now.mockReturnValue(0);
      send('nativeTabReselect', 'bunch');
      now.mockReturnValue(200);
      send('nativeTabReselect', 'bunch');
      expect(gestures).toEqual([{ tab: 'bunch', kind: 'doublePress' }]);
    } finally {
      unsubscribe();
    }
  });

  it('다른 탭에 다녀오면(이 WebView가 가려짐) 앞선 다시 누름과 이어 세지 않는다', () => {
    const now = vi.spyOn(performance, 'now');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { gestures, unsubscribe } = renderBar('/bunch');
    try {
      now.mockReturnValue(0);
      send('nativeTabReselect', 'bunch');
      visibility.mockReturnValue('hidden');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      visibility.mockReturnValue('visible');
      now.mockReturnValue(200);
      send('nativeTabReselect', 'bunch');
      expect(gestures).toEqual([]);
    } finally {
      unsubscribe();
    }
  });
});

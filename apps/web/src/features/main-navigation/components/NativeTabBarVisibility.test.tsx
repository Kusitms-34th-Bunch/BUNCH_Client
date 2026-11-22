import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeTabBarVisibility } from './NativeTabBarVisibility';

const setNativeTabBarVisible = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
const setNativeTabBarVisibleFor = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
const setNativeTabBar = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
// 기본은 이전 쉘(첫 화면 WebView): 탭 ID가 없고 탭별 메서드도 없음
const shell = vi.hoisted(() => ({ tab: null as string | null, perTab: false }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  nativeShellTab: () => shell.tab,
  hasNativeMethod: (method: string) => method === 'setNativeTabBarVisibleFor' && shell.perTab,
  appBridge: { setNativeTabBarVisible, setNativeTabBarVisibleFor, setNativeTabBar },
}));
const pathname = vi.hoisted(() => ({ current: '/bunch' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });

// 보일 때는 한 프레임 뒤에 보냄(시트 확인): 기본은 프레임을 바로 실행해 기존 흐름 그대로 확인
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setNativeTabBarVisible.mockClear();
  setNativeTabBarVisibleFor.mockClear();
  setNativeTabBar.mockClear();
  shell.tab = null;
  shell.perTab = false;
  setVisibility('visible');
});

describe('NativeTabBarVisibility (iOS 쉘)', () => {
  it('탭 화면이면 표시하고 탭 밖 화면으로 가면 숨긴다', () => {
    pathname.current = '/bunch';
    const { rerender } = render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);

    pathname.current = '/onboarding';
    rerender(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);
  });

  it('탭 화면이어도 시트·대화상자가 열린 동안에는 숨기고 닫히면 다시 표시한다', async () => {
    pathname.current = '/photos';
    render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);

    // DOM 변화 감지(MutationObserver)는 비동기라, act 안에서 감지 콜백과 React 갱신을 끝낸 뒤 확인
    // (waitFor의 1초 대기는 전체 테스트를 동시에 돌리는 부하에서 넘칠 수 있음)
    const mutate = (change: () => void) =>
      act(async () => {
        change();
        await Promise.resolve();
      });
    const sheet = document.createElement('div');
    sheet.setAttribute('role', 'dialog');
    await mutate(() => document.body.append(sheet));
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);

    // 닫힘 애니메이션이 시작되면 요소가 사라지기 전이라도 바로 다시 표시
    await mutate(() => sheet.setAttribute('data-ending-style', ''));
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);
    // 지운 뒤의 감지 콜백도 테스트 안에서 끝냄(다음 테스트로 새지 않게)
    await mutate(() => sheet.remove());
  });

  it('시트가 내려가는 동안(data-sheet-moving)에는 탭 바를 보이지 않고, 다 내려간 뒤 보인다', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const sheet = document.body.appendChild(document.createElement('div'));
    sheet.setAttribute('data-sheet-moving', '');
    pathname.current = '/bunch';
    render(<NativeTabBarVisibility />);
    act(() => frames.splice(0).forEach((callback) => callback(0)));
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();

    sheet.remove();
    act(() => frames.splice(0).forEach((callback) => callback(0)));
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);
  });

  it('화면에 보이지 않는 탭 WebView는 보내지 않고, 다시 보이면 현재 상태를 보낸다', () => {
    setVisibility('hidden');
    pathname.current = '/photos/1';
    render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);
  });

  it('로그인 전 화면에 오면 탭 화면을 끝내고, 탭 바 표시 여부는 보내지 않는다', () => {
    pathname.current = '/my';
    const { rerender } = render(<NativeTabBarVisibility exitPaths={['/login']} />);
    expect(setNativeTabBar).not.toHaveBeenCalled();
    setNativeTabBarVisible.mockClear();

    pathname.current = '/login';
    rerender(<NativeTabBarVisibility exitPaths={['/login']} />);
    expect(setNativeTabBar).toHaveBeenCalledTimes(1);
    expect(setNativeTabBar).toHaveBeenCalledWith(expect.objectContaining({ hidden: true }));
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();
  });

  it('로그인 전 화면 사이를 오가도 탭 화면 종료는 한 번만 보낸다', () => {
    const exitPaths = ['/intro', '/login'];
    pathname.current = '/intro';
    const { rerender } = render(<NativeTabBarVisibility exitPaths={exitPaths} />);
    pathname.current = '/login';
    rerender(<NativeTabBarVisibility exitPaths={exitPaths} />);
    expect(setNativeTabBar).toHaveBeenCalledTimes(1);
  });

  it('화면에 보이지 않는 탭 WebView는 로그인 전 화면에 와도 탭 화면을 끝내지 않고, 보이게 되면 끝낸다', () => {
    setVisibility('hidden');
    pathname.current = '/login';
    render(<NativeTabBarVisibility exitPaths={['/login']} />);
    expect(setNativeTabBar).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setNativeTabBar).toHaveBeenCalledWith(expect.objectContaining({ hidden: true }));
  });

  it('로그인 전 화면을 벗어난 뒤에는 다시 보이게 돼도 탭 화면 종료를 보내지 않는다', () => {
    pathname.current = '/login';
    const { rerender } = render(<NativeTabBarVisibility exitPaths={['/login']} />);
    pathname.current = '/feed';
    rerender(<NativeTabBarVisibility exitPaths={['/login']} />);
    setNativeTabBar.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));
    expect(setNativeTabBar).not.toHaveBeenCalled();
  });

  it('탭별 메서드가 있는 쉘의 탭 WebView는 화면에 보이지 않아도 자기 탭 값으로 보낸다(#481)', () => {
    shell.tab = 'bunch';
    shell.perTab = true;
    setVisibility('hidden');
    pathname.current = '/bunch/places';
    const { rerender } = render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisibleFor).toHaveBeenLastCalledWith({ tab: 'bunch', visible: false });

    pathname.current = '/bunch';
    rerender(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisibleFor).toHaveBeenLastCalledWith({ tab: 'bunch', visible: true });
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();
    // 보이지 않는 WebView는 프레임이 멈출 수 있어 프레임을 기다리지 않고 바로 보냄
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('이전 쉘의 탭 WebView(탭 ID는 있지만 탭별 메서드 없음)는 기존 방식으로 보낸다', () => {
    shell.tab = 'bunch';
    shell.perTab = false;
    pathname.current = '/bunch/places';
    render(<NativeTabBarVisibility />);

    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);
    expect(setNativeTabBarVisibleFor).not.toHaveBeenCalled();
  });
});

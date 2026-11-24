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

  // happy-dom은 배치가 없어 덮는 요소의 화면 위치를 직접 줌(화면 전체 폭, 윗변만 바꿈)
  const coverAt = (element: HTMLElement, topRatio: number) =>
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: window.innerWidth,
      top: window.innerHeight * topRatio,
      bottom: window.innerHeight * (topRatio + 1),
    } as DOMRect);
  const runFramesWith = () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    return () => act(() => frames.splice(0).forEach((callback) => callback(0)));
  };

  it.each([
    [
      '움직이는 화면 sheet',
      (element: HTMLElement) => element.setAttribute('data-sheet-moving', ''),
    ],
    [
      '전환 중 나가는 화면',
      (element: HTMLElement) => element.setAttribute('data-page-leaving', ''),
    ],
    [
      '닫히는 중인 바텀시트',
      (element: HTMLElement) => {
        element.setAttribute('role', 'dialog');
        element.setAttribute('data-ending-style', '');
      },
    ],
  ])(
    '%s가 탭 바 자리를 덮는 동안은 기다리고, 비켜나면 다 끝나기 전이라도 보인다',
    (_name, mark) => {
      const runFrames = runFramesWith();
      const cover = document.body.appendChild(document.createElement('div'));
      mark(cover);
      const rect = coverAt(cover, 0.5);
      pathname.current = '/bunch';
      render(<NativeTabBarVisibility />);
      runFrames();
      expect(setNativeTabBarVisible).not.toHaveBeenCalled();

      // 표식은 아직 있지만 윗변이 탭 바 자리(아래 15%)를 거의 지남
      rect.mockReturnValue({
        left: 0,
        right: window.innerWidth,
        top: window.innerHeight * 0.98,
        bottom: window.innerHeight * 1.98,
      } as DOMRect);
      runFrames();
      expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);
      cover.remove();
    },
  );

  it('제자리에서 흐려지며 나가는 화면(상세 → 피드)은 반 넘게 흐려지면 다 사라지기 전이라도 보인다(#532)', () => {
    const runFrames = runFramesWith();
    const cover = document.body.appendChild(document.createElement('div'));
    cover.setAttribute('data-page-leaving', '');
    coverAt(cover, 0);
    pathname.current = '/feed';
    render(<NativeTabBarVisibility />);
    cover.style.opacity = '0.7';
    runFrames();
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();

    cover.style.opacity = '0.4';
    runFrames();
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);
    cover.remove();
  });

  it('닫히는 바텀시트는 흐려져도 탭 바 자리에 남아 있으면 기다린다(내려가며 함께 흐려짐)', () => {
    const runFrames = runFramesWith();
    const cover = document.body.appendChild(document.createElement('div'));
    cover.setAttribute('role', 'dialog');
    cover.setAttribute('data-ending-style', '');
    cover.style.opacity = '0.4';
    coverAt(cover, 0.5);
    pathname.current = '/feed';
    render(<NativeTabBarVisibility />);
    runFrames();
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();
    cover.remove();
  });

  it('덮는 것이 사라지지 않아도 1초가 지나면 보인다', () => {
    const runFrames = runFramesWith();
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const cover = document.body.appendChild(document.createElement('div'));
    cover.setAttribute('data-page-leaving', '');
    coverAt(cover, 0);
    pathname.current = '/bunch';
    render(<NativeTabBarVisibility />);
    runFrames();
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();
    now.mockReturnValue(1000);
    runFrames();
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);
    cover.remove();
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

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardViewport } from './KeyboardViewport';

type NativeKeyboard = { height: number; duration: number };
type NativeKeyboardListener = (_keyboard: NativeKeyboard) => void;
const nativeListeners = vi.hoisted(() => new Set<NativeKeyboardListener>());
vi.mock('@/shared/bridge/client', () => ({
  appBridge: {
    addEventListener: (_name: string, listener: NativeKeyboardListener) => {
      nativeListeners.add(listener);
      return () => nativeListeners.delete(listener);
    },
  },
}));
const sendNativeKeyboard = (event: NativeKeyboard) =>
  nativeListeners.forEach((listen) => listen(event));

const stubViewport = (height: number) => {
  const viewport = Object.assign(new EventTarget(), { height, scale: 1, offsetTop: 0 });
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
  return viewport;
};

const root = document.documentElement;
let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  vi.restoreAllMocks();
});

describe('KeyboardViewport', () => {
  it('키보드가 뜨면 표식을 바로 두고 아래 영역만 곡선으로 올린 뒤 높이를 한 번에 줄이며 iOS가 올린 문서를 되돌리고, 닫히면 높이를 먼저 되돌리고 아래 영역을 내림', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const frame = document.createElement('div');
    frame.setAttribute('data-app-frame', '');
    frame.innerHTML =
      '<div data-page-shell><main></main><div data-toast-anchor="wrapper"></div></div><div data-safe-area-bottom></div>';
    document.body.append(frame);
    try {
      const viewport = stubViewport(window.innerHeight);
      render(<KeyboardViewport />);
      const height = () => root.style.getPropertyValue('--keyboard-viewport-height');
      const bar = frame.querySelector<HTMLElement>('[data-toast-anchor]')!;
      const spacer = frame.querySelector<HTMLElement>('[data-safe-area-bottom]')!;
      const offset = (element: HTMLElement) =>
        Number(/translate3d\(0, (-?[\d.]+)px/.exec(element.style.transform)?.[1] ?? 0);

      viewport.height = window.innerHeight - 300;
      Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(root).toHaveAttribute('data-keyboard-open');
      expect(scrollTo).toHaveBeenCalledWith(0, 0);

      // 움직이는 동안 높이는 그대로, 아래 영역(하단 슬롯·여백)이 함께 올라감
      await act(() => vi.advanceTimersByTimeAsync(48));
      expect(height()).toBe('');
      expect(offset(bar)).toBeLessThan(0);
      expect(offset(bar)).toBeGreaterThan(-300);
      expect(offset(spacer)).toBe(offset(bar));
      // 끝나면 높이를 한 번에 줄이고 transform을 걷음
      await act(() => vi.advanceTimersByTimeAsync(320));
      expect(height()).toBe(`${window.innerHeight - 300}px`);
      expect(bar.style.transform).toBe('');

      // 닫힘: 높이를 먼저 되돌리면 아래 영역이 300px 내려가므로 그만큼 올린 자리에서 출발
      vi.spyOn(spacer, 'getBoundingClientRect')
        .mockReturnValueOnce({ top: 500 } as DOMRect)
        .mockReturnValueOnce({ top: 800 } as DOMRect);
      viewport.height = window.innerHeight;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(root).not.toHaveAttribute('data-keyboard-open');
      expect(height()).toBe('');
      await act(() => vi.advanceTimersByTimeAsync(48));
      expect(offset(bar)).toBeLessThan(0);
      expect(offset(bar)).toBeGreaterThan(-300);
      await act(() => vi.advanceTimersByTimeAsync(400));
      expect(bar.style.transform).toBe('');
    } finally {
      frame.remove();
      vi.useRealTimers();
    }
  });

  it('입력란을 벗어나면 iOS 닫힘 알림을 기다리지 않고 바로 닫기 시작하고, 늦게 온 키보드 높이로 다시 줄이지 않음', () => {
    const viewport = stubViewport(window.innerHeight - 300);
    render(<KeyboardViewport />);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root).toHaveAttribute('data-keyboard-open');

    act(() => input.blur());
    expect(root).not.toHaveAttribute('data-keyboard-open');
    // 키보드가 아직 내려가는 중이라 iOS가 이전 높이를 한 번 더 알려도 그대로
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root).not.toHaveAttribute('data-keyboard-open');

    // 다시 입력란에 초점이 오면 열림을 따름
    act(() => input.focus());
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root).toHaveAttribute('data-keyboard-open');
    input.remove();
  });

  it('다른 입력란으로 옮길 때는 닫지 않음', () => {
    const viewport = stubViewport(window.innerHeight - 300);
    render(<KeyboardViewport />);
    const first = document.createElement('input');
    const second = document.createElement('input');
    document.body.append(first, second);
    first.focus();
    act(() => void viewport.dispatchEvent(new Event('resize')));

    act(() => second.focus());
    expect(root).toHaveAttribute('data-keyboard-open');
    first.remove();
    second.remove();
  });

  it('쉘이 키보드 움직임을 알리면 보이는 높이를 기다리지 않고 그 시간 동안 맞추고, 아직 안 바뀐 보이는 높이로 되돌리지 않음', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const viewport = stubViewport(window.innerHeight);
      render(<KeyboardViewport />);
      const height = () => root.style.getPropertyValue('--keyboard-viewport-height');

      act(() => sendNativeKeyboard({ height: 300, duration: 250 }));
      expect(root).toHaveAttribute('data-keyboard-open');
      // 보이는 높이가 아직 그대로여도 열림 유지
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(root).toHaveAttribute('data-keyboard-open');
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(height()).toBe(`${window.innerHeight - 300}px`);

      // 초점이 그대로인 닫힘(쓸어 닫기)도 쉘 알림으로 닫음
      viewport.height = window.innerHeight - 300;
      act(() => sendNativeKeyboard({ height: 0, duration: 250 }));
      expect(root).not.toHaveAttribute('data-keyboard-open');
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(root).not.toHaveAttribute('data-keyboard-open');
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(height()).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('키보드가 낮아져 앱 틀이 커질 때는 높이를 먼저 늘리고 아래 영역을 내림(본문 아래가 비지 않게)', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const frame = document.createElement('div');
    frame.setAttribute('data-app-frame', '');
    frame.innerHTML =
      '<div data-page-shell><main></main><div data-toast-anchor="wrapper"></div></div><div data-safe-area-bottom></div>';
    document.body.append(frame);
    try {
      stubViewport(window.innerHeight);
      render(<KeyboardViewport />);
      const height = () => root.style.getPropertyValue('--keyboard-viewport-height');
      const bar = frame.querySelector<HTMLElement>('[data-toast-anchor]')!;
      const spacer = frame.querySelector<HTMLElement>('[data-safe-area-bottom]')!;
      act(() => sendNativeKeyboard({ height: 400, duration: 250 }));
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(height()).toBe(`${window.innerHeight - 400}px`);

      // 이모지 → 일반 키보드: 높이를 바로 늘리면 아래 영역이 100px 내려가므로 그만큼 올린 자리에서 출발
      vi.spyOn(spacer, 'getBoundingClientRect')
        .mockReturnValueOnce({ top: 400 } as DOMRect)
        .mockReturnValueOnce({ top: 500 } as DOMRect);
      act(() => sendNativeKeyboard({ height: 300, duration: 250 }));
      expect(height()).toBe(`${window.innerHeight - 300}px`);
      await act(() => vi.advanceTimersByTimeAsync(48));
      expect(bar.style.transform).toMatch(/translate3d\(0, -\d/);
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(bar.style.transform).toBe('');
      expect(height()).toBe(`${window.innerHeight - 300}px`);
    } finally {
      frame.remove();
      vi.useRealTimers();
    }
  });

  it('쉘 열림 알림 뒤 가려진 동안 키보드가 닫혔으면, 돌아왔을 때 보이는 높이로 다시 판단해 앱 틀을 되돌림', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    try {
      const viewport = stubViewport(window.innerHeight - 300);
      render(<KeyboardViewport />);
      visibility.mockReturnValue('visible');
      act(() => sendNativeKeyboard({ height: 300, duration: 250 }));
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(root).toHaveAttribute('data-keyboard-open');

      // 가려진 동안 온 닫힘 알림은 버려짐
      visibility.mockReturnValue('hidden');
      viewport.height = window.innerHeight;
      act(() => sendNativeKeyboard({ height: 0, duration: 250 }));

      visibility.mockReturnValue('visible');
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
      expect(root).not.toHaveAttribute('data-keyboard-open');
      await act(() => vi.advanceTimersByTimeAsync(320));
      expect(root.style.getPropertyValue('--keyboard-viewport-height')).toBe('');
    } finally {
      visibility.mockRestore();
      vi.useRealTimers();
    }
  });

  it('동작 줄이기면 높이를 바로 맞춤', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: query.includes('reduce') }) as MediaQueryList,
    );
    const viewport = stubViewport(window.innerHeight);
    render(<KeyboardViewport />);
    viewport.height = window.innerHeight - 300;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root.style.getPropertyValue('--keyboard-viewport-height')).toBe(
      `${window.innerHeight - 300}px`,
    );
  });

  it('키보드를 연 채 백그라운드에 갔다 돌아와 문서가 올라가 있으면 되돌림', () => {
    const viewport = stubViewport(window.innerHeight - 300);
    render(<KeyboardViewport />);
    act(() => void viewport.dispatchEvent(new Event('resize')));
    // 백그라운드에서 키보드가 닫히며 위치가 남음
    viewport.height = window.innerHeight;
    Object.defineProperty(window, 'scrollY', { value: 280, configurable: true });
    vi.mocked(window.scrollTo).mockClear();

    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('키보드가 열린 적 없는 문서 스크롤(낮은 화면에서 하단 버튼까지 내림)은 초점이 옮겨도 그대로 둠', () => {
    stubViewport(window.innerHeight);
    render(<KeyboardViewport />);
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });

    act(() => void document.dispatchEvent(new Event('focusout')));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('앱 틀 밖(body 포털의 모달·시트) 입력란이면 iOS가 올린 위치를 두고 높이만 맞춤', () => {
    const viewport = stubViewport(window.innerHeight);
    render(<KeyboardViewport />);
    const sheetInput = document.createElement('input');
    document.body.append(sheetInput);
    sheetInput.focus();

    viewport.height = window.innerHeight - 300;
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root).toHaveAttribute('data-keyboard-open');
    expect(scrollTo).not.toHaveBeenCalled();
    sheetInput.remove();
  });

  it('핀치 확대 중에는 위치를 건드리지 않음', () => {
    const viewport = stubViewport(window.innerHeight - 300);
    viewport.scale = 2;
    render(<KeyboardViewport />);
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });

    act(() => void viewport.dispatchEvent(new Event('scroll')));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(root).not.toHaveAttribute('data-keyboard-open');
  });

  it('키보드가 뜨면 줄어들 본문 아래 경계에 맞춰 시작할 때 초점 입력란을 보이게 본문만 스크롤', () => {
    const viewport = stubViewport(window.innerHeight);
    const { container } = render(
      <main>
        <textarea aria-label="소개" />
        <KeyboardViewport />
      </main>,
    );
    const main = container.querySelector('main')!;
    const input = container.querySelector('textarea')!;
    input.focus();
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 400 } as DOMRect);
    // 본문을 스크롤한 만큼 입력란이 위로 올라감
    vi.spyOn(input, 'getBoundingClientRect').mockImplementation(
      () => ({ top: 420 - main.scrollTop, bottom: 480 - main.scrollTop }) as DOMRect,
    );

    viewport.height = window.innerHeight - 150;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    // 곧 150px 줄어들 본문(아래 경계 250) 위 16px에 입력란 아래 끝
    expect(main.scrollTop).toBe(480 - 250 + 16);
  });

  it('열리는 동안 본문이 아직 줄지 않아도 미리 스크롤할 수 있게 아래 여백을 줄어들 만큼 늘렸다가, 높이를 줄인 뒤 되돌림', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const viewport = stubViewport(window.innerHeight);
      const { container } = render(
        <main style={{ paddingBottom: '8px' }}>
          <textarea aria-label="소개" />
          <KeyboardViewport />
        </main>,
      );
      const main = container.querySelector('main')!;
      container.querySelector('textarea')!.focus();

      viewport.height = window.innerHeight - 300;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(main.style.paddingBottom).toBe('308px');

      await act(() => vi.advanceTimersByTimeAsync(320));
      expect(main.style.paddingBottom).toBe('8px');

      // 열리는 도중 입력란을 벗어나 닫혀도 늘린 여백을 되돌림
      viewport.height = window.innerHeight;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      await act(() => vi.advanceTimersByTimeAsync(320));
      container.querySelector('textarea')!.focus();
      viewport.height = window.innerHeight - 300;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(main.style.paddingBottom).toBe('308px');
      act(() => container.querySelector('textarea')!.blur());
      expect(main.style.paddingBottom).toBe('8px');
    } finally {
      vi.useRealTimers();
    }
  });

  it('키보드가 열린 채 다른 입력란으로 옮기면 그 입력란만큼만 스크롤함(rAF 시각을 축소량으로 받지 않음)', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const viewport = stubViewport(window.innerHeight);
      const { container } = render(
        <main>
          <input aria-label="이름" />
          <textarea aria-label="소개" />
          <KeyboardViewport />
        </main>,
      );
      const main = container.querySelector('main')!;
      const [first, second] = [...container.querySelectorAll<HTMLElement>('input, textarea')];
      first!.focus();
      viewport.height = window.innerHeight - 300;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      await act(() => vi.advanceTimersByTimeAsync(320));

      // 다 열린 본문(아래 경계 400) 안에 이미 보이는 입력란
      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 400 } as DOMRect);
      vi.spyOn(second!, 'getBoundingClientRect').mockReturnValue({
        top: 300,
        bottom: 360,
      } as DOMRect);
      main.scrollTop = 0;
      act(() => second!.focus());
      await act(() => vi.advanceTimersByTimeAsync(20));

      expect(main.scrollTop).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('열림이 끝나 본문이 줄어도 시작할 때 이미 보이게 했으면 다시 스크롤하지 않음', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const viewport = stubViewport(window.innerHeight);
      const { container } = render(
        <main>
          <textarea aria-label="소개" />
          <KeyboardViewport />
        </main>,
      );
      const main = container.querySelector('main')!;
      const input = container.querySelector('textarea')!;
      input.focus();
      const mainRect = vi
        .spyOn(main, 'getBoundingClientRect')
        .mockReturnValue({ top: 0, bottom: 400 } as DOMRect);
      vi.spyOn(input, 'getBoundingClientRect').mockImplementation(
        () => ({ top: 320 - main.scrollTop, bottom: 380 - main.scrollTop }) as DOMRect,
      );

      viewport.height = window.innerHeight - 300;
      act(() => void viewport.dispatchEvent(new Event('resize')));
      expect(main.scrollTop).toBe(380 - 100 + 16);

      // 끝에 높이를 줄여 본문 아래 경계가 100이 되어도 입력란은 이미 그 위
      mainRect.mockReturnValue({ top: 0, bottom: 100 } as DOMRect);
      await act(() => vi.advanceTimersByTimeAsync(320));
      expect(main.scrollTop).toBe(380 - 100 + 16);
    } finally {
      vi.useRealTimers();
    }
  });

  it('쉘 알림으로 열린 뒤 키보드 높이가 바뀌면, 늦게 바뀌는 이전 보이는 높이로 목표를 덮지 않음', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const viewport = stubViewport(window.innerHeight);
      render(<KeyboardViewport />);
      const height = () => root.style.getPropertyValue('--keyboard-viewport-height');

      act(() => sendNativeKeyboard({ height: 300, duration: 250 }));
      await act(() => vi.advanceTimersByTimeAsync(270));
      viewport.height = window.innerHeight - 300;

      // 이모지 키보드처럼 높이만 바뀜. 보이는 높이는 아직 이전 값인 채 스크롤 알림이 먼저 옴
      act(() => sendNativeKeyboard({ height: 400, duration: 250 }));
      act(() => void viewport.dispatchEvent(new Event('scroll')));
      await act(() => vi.advanceTimersByTimeAsync(270));
      expect(height()).toBe(`${window.innerHeight - 400}px`);
    } finally {
      vi.useRealTimers();
    }
  });
});

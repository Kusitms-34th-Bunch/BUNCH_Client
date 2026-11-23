import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardViewport } from './KeyboardViewport';

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
  it('키보드가 뜨면 보이는 높이와 표식을 html에 두고 iOS가 올린 문서를 되돌리며, 닫히면 지움', () => {
    const viewport = stubViewport(window.innerHeight);
    render(<KeyboardViewport />);

    viewport.height = window.innerHeight - 300;
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root.style.getPropertyValue('--keyboard-viewport-height')).toBe(
      `${window.innerHeight - 300}px`,
    );
    expect(root).toHaveAttribute('data-keyboard-open');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    viewport.height = window.innerHeight;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(root.style.getPropertyValue('--keyboard-viewport-height')).toBe('');
    expect(root).not.toHaveAttribute('data-keyboard-open');
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

  it('키보드가 뜨면 본문 아래에 가린 초점 입력란이 보이게 본문만 스크롤', () => {
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
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 420, bottom: 480 } as DOMRect);

    viewport.height = window.innerHeight - 150;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(main.scrollTop).toBe(96);

    // 키보드가 더 올라와 본문이 줄면 다시 가린 만큼 한 번 더 내림
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 300 } as DOMRect);
    viewport.height = window.innerHeight - 300;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(main.scrollTop).toBe(96 + 196);
  });
});

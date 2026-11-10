import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoSelectionProvider } from '../contexts/PhotoSelectionContext';
import { type PhotoSelection, toggleSelection } from '../lib/selection';
import { PhotoDragSelect } from './PhotoDragSelect';

const IDS = ['a', 'b', 'c', 'd'];
const CELL = 100;

// jsdom은 레이아웃이 없어 elementFromPoint가 없으므로 가로 한 줄(칸 너비 100)로 좌표를 칸에 대응시킴
const mockHitTest = () => {
  document.elementFromPoint = (x: number, y: number) =>
    y < 0 || y > CELL
      ? null
      : (document.querySelector(`[data-photo-id="${IDS[Math.floor(x / CELL)]}"]`) ?? null);
};

afterEach(() => {
  // @ts-expect-error 테스트에서 붙인 mock을 걷음
  delete document.elementFromPoint;
});

function Harness({
  initial = [] as PhotoSelection,
  max,
  draggable = false,
}: {
  initial?: PhotoSelection;
  max?: number;
  /** 길게 눌러 날짜를 옮길 수 있는 사진 칸으로 표시 */
  draggable?: boolean;
}) {
  const [selection, setSelection] = useState<PhotoSelection>(initial);
  const onToggle = (id: string) => {
    const result = toggleSelection(selection, id, max);
    if (!result.rejected) setSelection(result.selection);
  };
  return (
    <PhotoSelectionProvider value={{ active: true, selection, onToggle }}>
      <PhotoDragSelect yieldToLongPressMs={300}>
        <ul>
          {IDS.map((id) => (
            <li
              key={id}
              data-photo-id={id}
              data-testid={id}
              {...(draggable ? { 'data-photo-draggable': '' } : undefined)}
            >
              <button
                type="button"
                aria-pressed={selection.includes(id)}
                onClick={() => onToggle(id)}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      </PhotoDragSelect>
    </PhotoSelectionProvider>
  );
}

const pressed = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent);

const pointer = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, init = {}) =>
  act(() => {
    fireEvent[type](screen.getByTestId('a').parentElement!, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      pointerType: 'touch',
      clientX: x,
      clientY: 50,
      ...init,
    });
  });

describe('PhotoDragSelect', () => {
  it('가로로 쓸면 지나간 사진을 모두 고른다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 120);
    pointer('pointerMove', 250);
    pointer('pointerUp', 250);

    expect(pressed()).toEqual(['a', 'b', 'c']);
  });

  it('선택돼 있던 사진에서 쓸기 시작하면 지나간 사진을 모두 푼다', () => {
    mockHitTest();
    render(<Harness initial={['a', 'b', 'd']} />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 120);
    pointer('pointerMove', 250);
    pointer('pointerUp', 250);

    expect(pressed()).toEqual(['d']);
  });

  it('빠르게 쓸어 칸을 건너뛰어도 사이 사진을 놓치지 않는다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 350);
    pointer('pointerUp', 350);

    expect(pressed()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('같은 쓸기에서 반대 방향으로 되돌아오면 벗어난 사진은 다시 풀린다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 120);
    pointer('pointerMove', 250);
    pointer('pointerMove', 120);
    pointer('pointerUp', 120);

    expect(pressed()).toEqual(['a', 'b']);
  });

  it('시작 사진을 지나 반대편으로 가면 그쪽으로 범위가 뒤집힌다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 150);
    pointer('pointerMove', 250);
    pointer('pointerMove', 350);
    pointer('pointerMove', 50);
    pointer('pointerUp', 50);

    expect(pressed()).toEqual(['a', 'b']);
  });

  it('되돌아와도 쓸기 전에 선택돼 있던 사진은 그대로 남는다', () => {
    mockHitTest();
    render(<Harness initial={['c']} />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 120);
    pointer('pointerMove', 250);
    pointer('pointerMove', 120);
    pointer('pointerUp', 120);

    expect(pressed()).toEqual(['a', 'b', 'c']);
  });

  it('세로로 먼저 움직이면 스크롤이므로 고르지 않는다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 20, { clientY: 90 });
    pointer('pointerMove', 250);
    pointer('pointerUp', 250);

    expect(pressed()).toEqual([]);
  });

  it('끌 수 있는 사진을 길게 누른 뒤 움직이면 쓸기가 아니라 길게 눌러 끌기에 넘긴다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['Date'] });
    render(<Harness draggable />);

    pointer('pointerDown', 10);
    vi.setSystemTime(Date.now() + 400);
    pointer('pointerMove', 120);
    pointer('pointerUp', 120);
    vi.useRealTimers();

    expect(pressed()).toEqual([]);
  });

  it('끌 수 없는 사진은 오래 누른 뒤 움직여도 쓸기로 본다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['Date'] });
    render(<Harness />);

    pointer('pointerDown', 10);
    vi.setSystemTime(Date.now() + 400);
    pointer('pointerMove', 120);
    pointer('pointerMove', 250);
    pointer('pointerUp', 250);
    vi.useRealTimers();

    expect(pressed()).toEqual(['a', 'b', 'c']);
  });

  it('마우스 버튼을 영역 밖에서 놓아 pointerup을 못 받아도 버튼 없이 움직이면 쓸기가 끝난다', () => {
    mockHitTest();
    render(<Harness />);
    const mouse = { pointerType: 'mouse', buttons: 1 };

    pointer('pointerDown', 10, mouse);
    pointer('pointerMove', 120, mouse);
    pointer('pointerMove', 250, { pointerType: 'mouse', buttons: 0 });

    expect(pressed()).toEqual(['a', 'b']);
  });

  it('최대 장수에 막히면 거기서 멈춘다', () => {
    mockHitTest();
    render(<Harness max={2} />);

    pointer('pointerDown', 10);
    pointer('pointerMove', 350);
    pointer('pointerUp', 350);

    expect(pressed()).toEqual(['a', 'b']);
  });

  it('쓰는 동안 손가락이 아래 가장자리에 있으면 목록이 아래로 스크롤된다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    render(
      <div data-testid="scroller" style={{ overflowY: 'auto' }}>
        <Harness />
      </div>,
    );
    const scroller = screen.getByTestId('scroller');
    let scrollTop = 0;
    Object.defineProperty(scroller, 'scrollTop', {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    scroller.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;

    pointer('pointerDown', 10);
    pointer('pointerMove', 120, { clientY: 95 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    pointer('pointerUp', 120);
    const scrolled = scrollTop;
    act(() => {
      vi.advanceTimersByTime(100);
    });
    vi.useRealTimers();

    expect(scrolled).toBeGreaterThan(0);
    // 손가락을 떼면 스크롤 중단
    expect(scrollTop).toBe(scrolled);
  });

  it('탭의 클릭이 손가락을 뗀 위치의 옆 사진으로 가도 처음 닿은 사진만 토글한다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 97);
    pointer('pointerMove', 103);
    pointer('pointerUp', 103);
    // 브라우저는 클릭을 뗀 위치의 요소(b)로 보냄
    fireEvent.click(screen.getByRole('button', { name: 'b' }));

    expect(pressed()).toEqual(['a']);
  });

  it('탭 직후의 클릭은 한 번만 막고 그다음 클릭(키보드 등)은 그대로 처리한다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    fireEvent.click(screen.getByRole('button', { name: 'c' }));

    expect(pressed()).toEqual(['a', 'c']);
  });

  it('억제 시간이 지난 뒤의 클릭(키보드 등)은 그대로 처리한다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    vi.useRealTimers();

    expect(pressed()).toEqual(['a', 'c']);
  });

  it('스크롤 중(관성 스크롤 포함)에 댄 터치는 선택으로 보지 않는다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['Date'] });
    render(
      <div data-testid="scroller" style={{ overflowY: 'auto' }}>
        <Harness />
      </div>,
    );
    const scroller = screen.getByTestId('scroller');
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });

    // 첫 터치로 스크롤러를 감시하기 시작하고, 곧 스크롤이 일어난 직후의 터치는 건너뜀
    pointer('pointerDown', 350);
    pointer('pointerUp', 350);
    fireEvent.scroll(scroller);
    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    const whileScrolling = pressed();

    vi.setSystemTime(Date.now() + 300);
    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    vi.useRealTimers();

    expect(whileScrolling).toEqual(['d']);
    expect(pressed()).toEqual(['a', 'd']);
  });

  it('언마운트하면 감시하던 스크롤 리스너를 해제한다', () => {
    mockHitTest();
    const { unmount } = render(
      <div data-testid="scroller" style={{ overflowY: 'auto' }}>
        <Harness />
      </div>,
    );
    const scroller = screen.getByTestId('scroller');
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    const add = vi.spyOn(scroller, 'addEventListener');
    const remove = vi.spyOn(scroller, 'removeEventListener');

    // 누르는 순간 스크롤러를 찾아 감시하고(마운트 때는 아직 스크롤할 수 없는 목록이었음), 선택이 바뀌어 다시 그려진 뒤에도 같은 함수로 해제
    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    unmount();

    const added = add.mock.calls.find(([type]) => type === 'scroll')?.[1];
    const removed = remove.mock.calls.find(([type]) => type === 'scroll')?.[1];
    expect(added).toBeDefined();
    expect(removed).toBe(added);
  });

  it('길게 누르기 직전(약 280ms)에 뗀 탭도 끌기 쪽에 넘겨 이중 토글을 막는다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['Date'] });
    render(<Harness draggable />);

    pointer('pointerDown', 10);
    vi.setSystemTime(Date.now() + 290);
    pointer('pointerUp', 10);
    vi.useRealTimers();
    const afterRelease = pressed();
    // 이 구간은 끌기가 아니면 뒤따르는 클릭이 정확히 한 번 토글을 맡음
    fireEvent.click(screen.getByRole('button', { name: 'a' }));

    expect(afterRelease).toEqual([]);
    expect(pressed()).toEqual(['a']);
  });

  it('끌 수 있는 사진을 오래 누르고 뗀 탭은 끌기 쪽이 처리하므로 여기서는 토글하지 않는다', () => {
    mockHitTest();
    vi.useFakeTimers({ toFake: ['Date'] });
    render(<Harness draggable />);

    pointer('pointerDown', 10);
    vi.setSystemTime(Date.now() + 400);
    pointer('pointerUp', 10);
    vi.useRealTimers();

    expect(pressed()).toEqual([]);
  });

  it('제자리에서 누르기만 하면 손가락을 뗄 때 한 번만 토글하고 뒤따르는 클릭은 막는다', () => {
    mockHitTest();
    render(<Harness />);

    pointer('pointerDown', 10);
    pointer('pointerUp', 10);
    fireEvent.click(screen.getByRole('button', { name: 'a' }));

    expect(pressed()).toEqual(['a']);
  });
});

import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onMainTabGesture } from '@/shared/lib/navigation/mainTabGesture';
import { MainTabBar } from './MainTabBar';

const route = vi.hoisted(() => ({ pathname: '/feed' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
// 맨 위로 움직이는 방식은 scrollPageToTop.test.ts가 확인하고, 여기서는 부르는지만 봄
const scrollPageToTop = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/navigation/scrollPageToTop', () => ({ scrollPageToTop }));

describe('MainTabBar', () => {
  afterEach(() => {
    route.pathname = '/feed';
    vi.useRealTimers();
  });

  it('웹 막대 영역을 토스트 앵커(tab-bar)로 표시한다', () => {
    const { container } = render(<MainTabBar />);

    const bar = container.querySelector('[data-main-tab-bar]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('data-toast-anchor', 'tab-bar');
  });

  it('지금 탭의 첫 화면에서 그 탭을 다시 누르면 이동하지 않고 화면을 맨 위로 올린다', () => {
    const { container } = render(
      <>
        <main data-testid="page" />
        <MainTabBar />
      </>,
    );
    scrollPageToTop.mockClear();
    const feed = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')!;

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(feed, click);
    expect(click.defaultPrevented).toBe(true);
    expect(scrollPageToTop).toHaveBeenCalled();
  });

  it('지금 탭을 짧은 간격으로 두 번 다시 누르면 그 탭 화면에 두 번 누르기를 알리고, 간격이 길면 알리지 않는다', () => {
    const now = vi.spyOn(performance, 'now');
    const gestures: unknown[] = [];
    const unsubscribe = onMainTabGesture((gesture) => {
      gestures.push(gesture);
      return true;
    });
    try {
      const { container } = render(<MainTabBar />);
      const feed = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')!;

      now.mockReturnValue(0);
      fireEvent.click(feed, { detail: 1 });
      now.mockReturnValue(400);
      fireEvent.click(feed, { detail: 1 });
      expect(gestures).toEqual([]);

      now.mockReturnValue(600);
      fireEvent.click(feed, { detail: 1 });
      expect(gestures).toEqual([{ tab: 'feed', kind: 'doublePress' }]);
      // 세 번째 누름은 새 시작(연달아 세 번이면 두 번 누르기 한 번)
      now.mockReturnValue(700);
      fireEvent.click(feed, { detail: 1 });
      expect(gestures).toHaveLength(1);
    } finally {
      unsubscribe();
      now.mockRestore();
    }
  });

  it('키보드로 누른 클릭(Enter 반복 포함)은 두 번 누르기로 세지 않는다', () => {
    const gestures: unknown[] = [];
    const unsubscribe = onMainTabGesture((gesture) => {
      gestures.push(gesture);
      return true;
    });
    try {
      const { container } = render(<MainTabBar />);
      const feed = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')!;
      fireEvent.click(feed, { detail: 0 });
      fireEvent.click(feed, { detail: 0 });
      // 키보드 클릭 뒤의 포인터 클릭도 새 시작
      fireEvent.click(feed, { detail: 1 });
      expect(gestures).toEqual([]);
    } finally {
      unsubscribe();
    }
  });

  it('보조 키를 누른 클릭(새 탭 열기 등)은 가로채지 않는다', () => {
    const { container } = render(
      <>
        <main data-testid="page" />
        <MainTabBar />
      </>,
    );
    scrollPageToTop.mockClear();
    const feed = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')!;

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    fireEvent(feed, click);
    expect(scrollPageToTop).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  describe('꾹 누르기', () => {
    const renderOn = (pathname: string) => {
      route.pathname = pathname;
      vi.useFakeTimers();
      const gestures: unknown[] = [];
      const unsubscribe = onMainTabGesture((gesture) => {
        gestures.push(gesture);
        return true;
      });
      const { container } = render(
        <>
          <main data-testid="page" />
          <MainTabBar />
        </>,
      );
      scrollPageToTop.mockClear();
      const bunch = container.querySelector<HTMLAnchorElement>('a[href="/bunch"]')!;
      return { bunch, gestures, unsubscribe };
    };
    const down = { isPrimary: true, button: 0, clientX: 10, clientY: 10 };

    it('번치 탭 첫 화면에서 번치 탭을 누르고 있으면 꾹 누르기를 알리고, 손을 뗀 click은 무시한다', () => {
      const { bunch, gestures, unsubscribe } = renderOn('/bunch');
      try {
        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(499);
        expect(gestures).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(gestures).toEqual([{ tab: 'bunch', kind: 'longPress' }]);

        fireEvent.pointerUp(bunch);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
        fireEvent(bunch, click);
        expect(click.defaultPrevented).toBe(true);
        // 다시 누르기(맨 위로)로 처리하지 않음
        expect(scrollPageToTop).not.toHaveBeenCalled();
        expect(gestures).toHaveLength(1);
      } finally {
        unsubscribe();
      }
    });

    it('꾹 누른 뒤 click이 오지 않아도 다른 탭 click과 시간이 지난 click은 막지 않는다', () => {
      const { bunch, unsubscribe } = renderOn('/bunch');
      try {
        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(500);
        fireEvent.pointerUp(bunch);

        const feed = document.querySelector<HTMLAnchorElement>('a[href="/feed"]')!;
        const other = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
        fireEvent(feed, other);
        expect(other.defaultPrevented).toBe(false);

        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(500);
        fireEvent.pointerUp(bunch);
        vi.advanceTimersByTime(1000);
        fireEvent.click(bunch, { detail: 1 });
        expect(scrollPageToTop).toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it('처리한 화면이 없으면(받는 중·오류) 손을 뗀 click은 평소처럼 맨 위로 올린다', () => {
      route.pathname = '/bunch';
      vi.useFakeTimers();
      const unsubscribe = onMainTabGesture(() => false);
      try {
        const { container } = render(
          <>
            <main data-testid="page" />
            <MainTabBar />
          </>,
        );
        scrollPageToTop.mockClear();
        const bunch = container.querySelector<HTMLAnchorElement>('a[href="/bunch"]')!;
        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(500);
        fireEvent.pointerUp(bunch);
        fireEvent.click(bunch, { detail: 1 });
        expect(scrollPageToTop).toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it('누르는 중이 아니면 문맥 메뉴(오른쪽 클릭)를 막지 않는다', () => {
      const { bunch, unsubscribe } = renderOn('/bunch');
      try {
        const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        fireEvent(bunch, menu);
        expect(menu.defaultPrevented).toBe(false);

        fireEvent.pointerDown(bunch, down);
        const pressing = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        fireEvent(bunch, pressing);
        expect(pressing.defaultPrevented).toBe(true);
      } finally {
        unsubscribe();
      }
    });

    it('일찍 떼거나 손가락이 움직이면 알리지 않는다', () => {
      const { bunch, gestures, unsubscribe } = renderOn('/bunch');
      try {
        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(300);
        fireEvent.pointerUp(bunch);
        vi.advanceTimersByTime(500);

        fireEvent.pointerDown(bunch, down);
        fireEvent.pointerMove(bunch, { clientX: 10, clientY: 30 });
        vi.advanceTimersByTime(600);
        expect(gestures).toEqual([]);
      } finally {
        unsubscribe();
      }
    });

    it('다른 탭 화면에서는 번치 탭을 누르고 있어도 알리지 않는다', () => {
      const { bunch, gestures, unsubscribe } = renderOn('/feed');
      try {
        fireEvent.pointerDown(bunch, down);
        vi.advanceTimersByTime(600);
        expect(gestures).toEqual([]);
      } finally {
        unsubscribe();
      }
    });
  });
});

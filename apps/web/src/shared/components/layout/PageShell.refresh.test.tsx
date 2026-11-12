import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageShell } from './PageShell';

// jsdom에는 Touch가 없어 touches만 얹은 이벤트를 보냄
function touch(target: Element, type: string, point?: { x: number; y: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: point ? [{ clientX: point.x, clientY: point.y }] : [],
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** 손가락을 (0,0)에서 눌러 아래로 끌고 놓음. 첫 8px은 당김 시작 판정에 쓰이고 이후 거리의 0.6배만큼 내려옴 */
function pull(main: Element, distance: number) {
  touch(main, 'touchstart', { x: 0, y: 0 });
  touch(main, 'touchmove', { x: 0, y: 10 });
  touch(main, 'touchmove', { x: 0, y: 10 + distance });
  touch(main, 'touchend');
}

describe('PageShell 당겨서 새로고침', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('기준 거리 이상 당겼다 놓으면 새로고침하고 끝나면 알린다', async () => {
    let finish: () => void = () => {};
    const onRefresh = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);

    pull(screen.getByRole('main'), 140);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('새로고침하고 있어요');

    await act(async () => {
      finish();
      await vi.advanceTimersByTimeAsync(1300);
    });

    expect(screen.getByRole('status')).toHaveTextContent('새로고침을 마쳤어요');
  });

  it('기준에 못 미치게 당기면 새로고침하지 않는다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);

    pull(screen.getByRole('main'), 100);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('이미 스크롤된 상태에서는 당기기를 시작하지 않는다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');
    main.scrollTop = 40;

    pull(main, 200);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('가로로 더 움직이면 당기지 않고 기본 동작을 막지 않는다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');

    touch(main, 'touchstart', { x: 0, y: 0 });
    const move = touch(main, 'touchmove', { x: 80, y: 20 });
    touch(main, 'touchend');

    expect(move.defaultPrevented).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('당기는 동안에는 목록이 같이 끌려가지 않도록 기본 스크롤을 막는다', () => {
    render(<PageShell onRefresh={vi.fn()}>본문</PageShell>);
    const main = screen.getByRole('main');

    touch(main, 'touchstart', { x: 0, y: 0 });
    touch(main, 'touchmove', { x: 0, y: 10 });
    const move = touch(main, 'touchmove', { x: 0, y: 60 });

    expect(move.defaultPrevented).toBe(true);
  });

  it('안쪽 요소가 이미 막은 이동은 당김으로 가져가지 않는다', () => {
    const onRefresh = vi.fn();
    render(
      <PageShell onRefresh={onRefresh}>
        <div data-testid="inner" />
      </PageShell>,
    );
    const inner = screen.getByTestId('inner');
    // 사진함의 쓸어 선택처럼 안쪽 요소가 touchmove를 먼저 받아 막는 경우
    inner.addEventListener('touchmove', (event) => event.preventDefault());

    touch(inner, 'touchstart', { x: 0, y: 0 });
    touch(inner, 'touchmove', { x: 0, y: 10 });
    touch(inner, 'touchmove', { x: 0, y: 200 });
    touch(inner, 'touchend');

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('당긴 채로 시작 자리보다 위로 올리면 내용이 그만큼 스크롤되고, 기준에 닿은 적이 있으면 놓을 때 새로고침한다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');
    const container = main.parentElement as HTMLElement;
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;

    touch(main, 'touchstart', { x: 0, y: 100 });
    touch(main, 'touchmove', { x: 0, y: 110 });
    touch(main, 'touchmove', { x: 0, y: 250 });
    expect(container.style.getPropertyValue('--pull-y')).toBe('72px');

    // 기본 스크롤은 막혀 있어 hook이 직접 스크롤: 시작 자리(110)보다 40px 위
    const up = touch(main, 'touchmove', { x: 0, y: 70 });
    expect(up.defaultPrevented).toBe(true);
    expect(main.scrollTop).toBe(40);
    expect(container.style.getPropertyValue('--pull-y')).toBe('0px');

    // 기준 거리까지 한 번 당겼으므로 헤더 밑으로 올렸다 놓아도 새로고침함
    touch(main, 'touchend');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('기준에 닿지 못한 채 위로 올렸다 놓으면 새로고침하지 않고 최상단으로 돌아온다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;

    touch(main, 'touchstart', { x: 0, y: 100 });
    touch(main, 'touchmove', { x: 0, y: 110 });
    touch(main, 'touchmove', { x: 0, y: 160 });
    touch(main, 'touchmove', { x: 0, y: 70 });
    touch(main, 'touchend');

    expect(onRefresh).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('새로고침 중에는 스크롤할 수 있고, 끝나면 스크롤 위치와 무관하게 맨 위로 올린다', async () => {
    let finish: () => void = () => {};
    render(
      <PageShell onRefresh={() => new Promise<void>((resolve) => (finish = resolve))}>
        본문
      </PageShell>,
    );
    const main = screen.getByRole('main');
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;
    pull(main, 140);

    // 새로고침 중의 스크롤은 막지 않음
    const move = touch(main, 'touchmove', { x: 0, y: 10 });
    expect(move.defaultPrevented).toBe(false);
    main.scrollTop = 100;
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      finish();
      await vi.advanceTimersByTimeAsync(1300);
    });

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(screen.getByRole('status')).toHaveTextContent('새로고침을 마쳤어요');
  });

  it('새로고침 중에 스크롤해 내용이 표시기 자리를 덮는 만큼 표시기를 흐리게 한다', () => {
    render(<PageShell onRefresh={() => new Promise<void>(() => {})}>본문</PageShell>);
    const main = screen.getByRole('main');
    const container = main.parentElement as HTMLElement;
    pull(main, 140);

    main.scrollTop = 0;
    act(() => {
      main.dispatchEvent(new Event('scroll'));
    });
    expect(container.style.getPropertyValue('--pull-fade')).toBe('1');

    // 간격 64px − 스크롤 30px − 표시기 위쪽 20px = 14px가 남아 36px 중 일부만 보임
    main.scrollTop = 30;
    act(() => {
      main.dispatchEvent(new Event('scroll'));
    });
    expect(Number(container.style.getPropertyValue('--pull-fade'))).toBeCloseTo(14 / 36);

    main.scrollTop = 60;
    act(() => {
      main.dispatchEvent(new Event('scroll'));
    });
    expect(container.style.getPropertyValue('--pull-fade')).toBe('0');
  });

  it('터치가 취소되면 기준을 넘게 당겼어도 새로고침하지 않는다', () => {
    const onRefresh = vi.fn();
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');

    touch(main, 'touchstart', { x: 0, y: 0 });
    touch(main, 'touchmove', { x: 0, y: 10 });
    touch(main, 'touchmove', { x: 0, y: 200 });
    touch(main, 'touchcancel');

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('끝났다는 안내는 잠시 뒤 비운다', async () => {
    render(<PageShell onRefresh={() => Promise.resolve()}>본문</PageShell>);

    pull(screen.getByRole('main'), 140);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(screen.getByRole('status')).toHaveTextContent('새로고침을 마쳤어요');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('refreshDisabled이면 당겨도 새로고침하지 않는다', () => {
    const onRefresh = vi.fn();
    render(
      <PageShell onRefresh={onRefresh} refreshDisabled>
        본문
      </PageShell>,
    );

    pull(screen.getByRole('main'), 200);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('새로고침 중에 다시 당겨도 중복으로 부르지 않는다', async () => {
    const onRefresh = vi.fn(() => new Promise<void>(() => {}));
    render(<PageShell onRefresh={onRefresh}>본문</PageShell>);
    const main = screen.getByRole('main');

    pull(main, 140);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    pull(main, 140);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('onRefresh가 없으면 새로고침 알림 영역을 그리지 않는다', () => {
    render(<PageShell>본문</PageShell>);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

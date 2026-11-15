import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageShell } from './PageShell';

// 레이아웃 없는 테스트 환경이라 헤더 높이(상태 표시줄 포함)를 직접 정함
const HEADER_HEIGHT = 100;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => {
  render(
    <PageShell
      collapsibleHeader
      header={
        <header>
          <a href="/notifications">알림</a>
        </header>
      }
    >
      <p>본문</p>
    </PageShell>,
  );
  const main = screen.getByRole('main');
  const header = screen.getByRole('banner').parentElement!;
  Object.defineProperty(header, 'offsetHeight', { configurable: true, value: HEADER_HEIGHT });
  const scrollTo = (top: number) =>
    act(() => {
      main.scrollTop = top;
      fireEvent.scroll(main);
    });
  // 스크롤이 멈춘 뒤의 정리(끝까지 넣거나 꺼냄)
  const stop = () =>
    act(() => {
      vi.advanceTimersByTime(200);
    });
  const shift = () => header.style.transform;
  return { main, header, scrollTo, stop, shift };
};

describe('PageShell 접는 헤더', () => {
  it('스크롤한 만큼 헤더가 따라 올라가고, 다 숨으면 inert가 된다', () => {
    const { main, header, scrollTo, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(30);
    expect(shift()).toBe('translateY(-30px)');
    expect(header).not.toHaveAttribute('inert');
    scrollTo(400);
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
    expect(header).toHaveAttribute('inert');
  });

  it('숨은 헤더는 위로 60px 올린 뒤부터 올린 만큼 내려오고, 다시 내리면 처음부터 센다', () => {
    const { main, header, scrollTo, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(200);
    scrollTo(400);
    // 60px까지는 그대로 숨어 있음
    scrollTo(345);
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
    scrollTo(320);
    expect(shift()).toBe('translateY(-80px)');
    expect(header).not.toHaveAttribute('inert');
    // 다시 내려 숨긴 뒤에는 처음부터 셈
    scrollTo(500);
    scrollTo(450);
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
  });

  it('멈추면 절반 넘게 숨은 헤더는 끝까지 넣고, 덜 숨은 헤더는 꺼낸다', () => {
    const { main, scrollTo, stop, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(300);
    // 90 올림(60 지난 30만 내려옴, 70 숨음) → 놓고 멈추면 끝까지 넣음
    scrollTo(210);
    fireEvent.touchEnd(main);
    stop();
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
    // 140 올림(60 지난 80 내려옴, 20 숨음) → 멈추면 꺼냄
    scrollTo(70);
    stop();
    expect(shift()).toBe('');
  });

  it('손가락을 대고 있는 동안은 멈춰도 정리하지 않고, 놓은 뒤에 정리한다', () => {
    const { main, scrollTo, stop, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(300);
    // 90 올림(60 지난 30만 내려옴, 70 숨음)
    scrollTo(210);
    stop();
    expect(shift()).toBe('translateY(-70px)');
    fireEvent.touchEnd(main);
    stop();
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
  });

  it('멈춰서 끝까지 숨긴 뒤에는 위로 올린 거리를 처음부터 센다', () => {
    const { main, scrollTo, stop, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(300);
    // 90 올림(70 숨음) → 놓고 멈추면 끝까지 넣음
    scrollTo(210);
    fireEvent.touchEnd(main);
    stop();
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
    // 다시 10만 올려도 60을 넘지 않아 그대로 숨어 있음
    fireEvent.touchStart(main);
    scrollTo(200);
    expect(shift()).toBe('translateY(calc(-100% - 2px))');
  });

  it('반쯤 숨은 헤더에 초점이 들어오면 바로 꺼내고 멈춰도 숨기지 않는다', () => {
    const { main, scrollTo, stop, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(300);
    scrollTo(210);
    fireEvent.touchEnd(main);
    act(() => screen.getByRole('link', { name: '알림' }).focus());
    expect(shift()).toBe('');
    stop();
    expect(shift()).toBe('');
  });

  it('화면에 있는 동안 켠 동작 줄이기도 정리 이동에 반영한다', () => {
    const query = { matches: false };
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
    const { main, header, scrollTo, stop } = setup();
    fireEvent.touchStart(main);
    scrollTo(300);
    scrollTo(210);
    fireEvent.touchEnd(main);
    query.matches = true;
    stop();
    expect(header.style.transition).toBe('none');
    spy.mockRestore();
  });

  it('맨 위에서는 스크롤한 거리보다 더 숨지 않고, 멈추면 다 보인다', () => {
    const { main, scrollTo, stop, shift } = setup();
    fireEvent.touchStart(main);
    scrollTo(70);
    expect(shift()).toBe('translateY(-70px)');
    fireEvent.touchEnd(main);
    stop();
    expect(shift()).toBe('');
  });

  it('사용자가 스크롤하기 전의 위치 이동(돌아올 때 스크롤 복원)에는 숨기지 않는다', () => {
    const { main, scrollTo, shift } = setup();
    scrollTo(800);
    expect(shift()).toBe('');
    // 복원 직후 처음 위로 올려도 숨지 않음
    fireEvent.touchStart(main);
    scrollTo(780);
    expect(shift()).toBe('');
  });

  it('헤더 안에 초점이 있으면 스크롤해도 숨기지 않는다', () => {
    const { scrollTo, shift } = setup();
    act(() => screen.getByRole('link', { name: '알림' }).focus());
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    scrollTo(300);
    expect(shift()).toBe('');
  });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { scrollPageToTop } from './scrollPageToTop';

const mainAt = (scrollTop: number, clientHeight = 800) => {
  const main = document.createElement('main');
  Object.defineProperty(main, 'clientHeight', { value: clientHeight });
  main.scrollTop = scrollTop;
  document.body.append(main);
  return main;
};
const reduceMotion = (reduce: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reduce } as MediaQueryList);

beforeEach(() =>
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }),
);
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

it('350ms 동안 천천히 시작해 맨 위에 멈춘다', () => {
  reduceMotion(false);
  const main = mainAt(1000);

  scrollPageToTop();
  vi.advanceTimersByTime(50);
  const early = main.scrollTop;
  vi.advanceTimersByTime(400);

  expect(early).toBeGreaterThan(900);
  expect(main.scrollTop).toBe(0);
});

it('두 화면보다 멀면 한 화면 위치로 바로 옮긴 뒤 그만큼만 움직인다', () => {
  reduceMotion(false);
  const main = mainAt(5000);

  scrollPageToTop();
  expect(main.scrollTop).toBe(800);
  vi.advanceTimersByTime(400);
  expect(main.scrollTop).toBe(0);
});

it.each(['touchstart', 'wheel', 'pointerdown', 'keydown'])(
  '움직이는 중 사용자가 직접 스크롤하면(%s) 그 자리에서 멈춘다',
  (type) => {
    reduceMotion(false);
    const main = mainAt(1000);

    scrollPageToTop();
    vi.advanceTimersByTime(150);
    main.dispatchEvent(new Event(type));
    const stoppedAt = main.scrollTop;
    vi.advanceTimersByTime(400);

    expect(stoppedAt).toBeGreaterThan(0);
    expect(main.scrollTop).toBe(stoppedAt);
  },
);

it('동작 줄이기면 바로 맨 위로 간다', () => {
  reduceMotion(true);
  const main = mainAt(1000);

  scrollPageToTop();

  expect(main.scrollTop).toBe(0);
});

it('움직이는 중 다시 누르면 앞 움직임을 멈추고 지금 위치에서 다시 350ms 동안 올린다', () => {
  reduceMotion(false);
  const main = mainAt(1000);

  scrollPageToTop();
  vi.advanceTimersByTime(200);
  const midway = main.scrollTop;
  scrollPageToTop();
  vi.advanceTimersByTime(200);
  // 앞 움직임이 남아 있었다면 이미 맨 위(350ms)에 닿았을 시점
  expect(main.scrollTop).toBeGreaterThan(0);
  expect(main.scrollTop).toBeLessThan(midway);
  vi.advanceTimersByTime(200);
  expect(main.scrollTop).toBe(0);
});

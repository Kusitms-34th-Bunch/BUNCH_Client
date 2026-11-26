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

it('한 화면 거리는 350ms 동안 빠르게 출발해 맨 위에서 천천히 멈춘다', () => {
  reduceMotion(false);
  const main = mainAt(800);

  scrollPageToTop();
  vi.advanceTimersByTime(80);
  const early = main.scrollTop;
  vi.advanceTimersByTime(200);
  const late = main.scrollTop;
  vi.advanceTimersByTime(100);

  // 감속 곡선: 앞부분에 많이 움직이고 끝에서는 조금만
  expect(early).toBeLessThan(600);
  expect(late).toBeLessThan(40);
  expect(main.scrollTop).toBe(0);
});

it('멀어도 순간 이동 없이 전체 거리를 움직이고, 먼 만큼 길게(최대 650ms) 움직인다', () => {
  reduceMotion(false);
  const main = mainAt(20000);

  scrollPageToTop();
  vi.advanceTimersByTime(16);
  // 예전처럼 한 화면 위치로 바로 옮기지 않음
  expect(main.scrollTop).toBeGreaterThan(800);
  vi.advanceTimersByTime(500);
  expect(main.scrollTop).toBeGreaterThan(0);
  vi.advanceTimersByTime(200);
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

it('움직이는 중 다시 누르면 앞 움직임을 멈추고 지금 위치에서 다시 올린다', () => {
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

it('움직이는 중 화면을 떠나면(inert) 더 이상 스크롤 값을 쓰지 않는다', () => {
  reduceMotion(false);
  const main = mainAt(1000);

  scrollPageToTop();
  vi.advanceTimersByTime(100);
  main.setAttribute('inert', '');
  // 나가는 화면을 붙잡는 쪽이 정해 둔 값
  main.scrollTop = 700;
  vi.advanceTimersByTime(100);

  expect(main.scrollTop).toBe(700);
});

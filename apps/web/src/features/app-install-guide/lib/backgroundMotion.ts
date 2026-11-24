import { DOT_GRID } from './dotGroups';

/** 배경 반복 한 바퀴 길이(초). 끝나면 처음 위치로 돌아와 끊김 없이 이어짐 */
export const LOOP_SECONDS = 12;

type Ellipse = {
  /** 좌우 폭(px)과 1바퀴 동안 오가는 횟수. 음수면 반대 방향 */
  x: readonly [amplitude: number, cycles: number];
  /** 0에서 이 값(px)까지 오가는 거리와 횟수 */
  y: readonly [amplitude: number, cycles: number];
  /** 1에서 1+이 값까지 커지는 정도와 횟수 */
  scale: readonly [amount: number, cycles: number];
  opacity: readonly [min: number, max: number, cycles: number];
  /** 원마다 어긋난 시작 위상(0~1) */
  phase: number;
};

// Figma 「PC 안내 페이지 · 모션 스펙」(8038:187436) 표 순서: 라벤더·민트·피치·핑크
export const ELLIPSES: readonly Ellipse[] = [
  { x: [420, 1], y: [-70, 2], scale: [0.22, 1], opacity: [0.55, 1, 1], phase: 0 },
  { x: [-460, 1], y: [60, 1], scale: [0.28, 2], opacity: [0.45, 0.95, 2], phase: 0.25 },
  { x: [-380, 1], y: [-80, 2], scale: [0.2, 1], opacity: [0.45, 0.9, 1], phase: 0.55 },
  { x: [360, 2], y: [50, 1], scale: [0.25, 1], opacity: [0.4, 0.85, 2], phase: 0.8 },
];

const wave = (seconds: number, cycles: number, phase: number) =>
  Math.sin(2 * Math.PI * ((cycles * seconds) / LOOP_SECONDS + phase));
const halfWave = (seconds: number, cycles: number, phase: number) =>
  0.5 + 0.5 * wave(seconds, cycles, phase);

/** 반복 안 시점(초)의 타원 위치·크기·투명도 */
export function ellipseFrame({ x, y, scale, opacity, phase }: Ellipse, seconds: number) {
  return {
    x: x[0] * wave(seconds, x[1], phase),
    y: y[0] * halfWave(seconds, y[1], phase),
    scale: 1 + scale[0] * halfWave(seconds, scale[1], phase),
    opacity: opacity[0] + (opacity[1] - opacity[0]) * halfWave(seconds, opacity[2], phase),
  };
}

// 묶음마다 12초에 3번 흐려지는 시작 시점(Figma 스펙 8038:187507 값 그대로)
const FLASH_STARTS = [
  [0, 4.1, 8.3],
  [1.5, 5.6, 9.8],
  [3.0, 7.1, 10.4],
  [0.8, 4.5, 8.6],
  [2.3, 6.0, 10.1],
  [3.8, 7.5, 10.4],
  [1.1, 5.3, 9.0],
  [2.6, 6.8, 10.4],
] as const;
const DIM_SECONDS = 0.55;
const RECOVER_SECONDS = 0.85;
// 1·3·5·7 묶음만 첫 번째로 흐려진 순간 한 칸 옮겼다가 세 번째로 흐려진 순간 제자리로
const SHIFTS: readonly (readonly [number, number] | null)[] = [
  [-1, 0],
  null,
  [0, 1],
  null,
  [1, 0],
  null,
  [0, -1],
  null,
];

const easeInOut = (progress: number) => 0.5 - 0.5 * Math.cos(Math.PI * progress);

/** 반복 안 시점(초)의 점 묶음 투명도와 이동(px) */
export function dotGroupFrame(group: number, seconds: number) {
  const starts = FLASH_STARTS[group] ?? FLASH_STARTS[0];
  // 가장 흐린 값은 묶음마다 0.12~0.22 사이로 고정
  const dimmest = 0.12 + (0.1 * group) / (FLASH_STARTS.length - 1);
  let opacity = 1;
  for (const start of starts) {
    const elapsed = seconds - start;
    if (elapsed < 0 || elapsed > DIM_SECONDS + RECOVER_SECONDS) continue;
    opacity =
      elapsed <= DIM_SECONDS
        ? 1 - (1 - dimmest) * easeInOut(elapsed / DIM_SECONDS)
        : dimmest + (1 - dimmest) * easeInOut((elapsed - DIM_SECONDS) / RECOVER_SECONDS);
  }
  const shift = SHIFTS[group];
  const shifted = shift && seconds >= starts[0] + DIM_SECONDS && seconds < starts[2] + DIM_SECONDS;
  return {
    opacity,
    dx: shifted ? shift[0] * DOT_GRID.cell : 0,
    dy: shifted ? shift[1] * DOT_GRID.cell : 0,
  };
}

/** 칸 번호 문자열(36진수 세 글자씩)을 점 중심 좌표(px)로 */
export function decodeDots(encoded: string) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < encoded.length; i += 3) {
    const cell = parseInt(encoded.slice(i, i + 3), 36);
    const column = cell % DOT_GRID.columns;
    const row = Math.floor(cell / DOT_GRID.columns);
    points.push({
      x: column * DOT_GRID.cell + DOT_GRID.cell / 2,
      y: row * DOT_GRID.cell + DOT_GRID.cell / 2,
    });
  }
  return points;
}

import type { Integrator } from '@ssgoi/react';

function bezier(t: number, first: number, second: number) {
  const u = 1 - t;
  return 3 * u * u * t * first + 3 * u * t * t * second + t * t * t;
}

function parameter(value: number, first: number, second: number) {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (bezier(mid, first, second) < value) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** CSS cubic-bezier(x1, y1, x2, y2) 곡선: 진행 시간 비율(0~1) → 진행 거리 비율(0~1) */
export function cubicBezierEasing([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  return (time: number) =>
    time <= 0 ? 0 : time >= 1 ? 1 : bezier(parameter(time, x1, x2), y1, y2);
}

/** SSGOI의 spring 대신 CSS cubic-bezier(x1, y1, x2, y2) 곡선을 정해진 시간 동안 재생(제어점은 0~1 안만) */
export function cubicBezierIntegrator(
  durationMs: number,
  [x1, y1, x2, y2]: readonly [number, number, number, number],
): Integrator {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('durationMs must be a positive finite number');
  }
  // 0~1 밖이면 곡선이 단조가 아니어서 시간을 되돌리는 계산이 틀리고 끝나지 않음(CSS도 x는 거부)
  if (![x1, y1, x2, y2].every((value) => value >= 0 && value <= 1)) {
    throw new RangeError('cubic-bezier control points must be within 0..1');
  }
  return {
    step(state, target, dt) {
      // position은 곡선의 y이므로 x(시간)로 되돌린 뒤 다음 시점 계산
      const time = bezier(parameter(state.position, y1, y2), x1, x2);
      const nextTime = Math.max(
        0,
        Math.min(1, time + (Math.sign(target - state.position) * dt * 1000) / durationMs),
      );
      const position =
        nextTime === 0 || nextTime === 1 ? nextTime : bezier(parameter(nextTime, x1, x2), y1, y2);
      return { position, velocity: dt > 0 ? (position - state.position) / dt : 0 };
    },
    isSettled: (state, target) => Math.abs(state.position - target) < 0.000001,
  };
}

/** SSGOI의 spring 대신 CSS ease-out(0, 0, .58, 1)을 정해진 시간 동안 재생 */
export function easeOutIntegrator(durationMs: number): Integrator {
  return cubicBezierIntegrator(durationMs, [0, 0, 0.58, 1]);
}

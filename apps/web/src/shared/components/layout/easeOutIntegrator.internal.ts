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

/** SSGOI의 spring 대신 CSS ease-out(0, 0, .58, 1)을 정해진 시간 동안 재생한다. */
export function easeOutIntegrator(durationMs: number): Integrator {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('durationMs must be a positive finite number');
  }
  return {
    step(state, target, dt) {
      // position은 곡선의 y이므로 x(시간)로 되돌린 뒤 다음 시점을 구한다.
      const time = bezier(parameter(state.position, 0, 1), 0, 0.58);
      const nextTime = Math.max(
        0,
        Math.min(1, time + (Math.sign(target - state.position) * dt * 1000) / durationMs),
      );
      const position =
        nextTime === 0 || nextTime === 1 ? nextTime : bezier(parameter(nextTime, 0, 0.58), 0, 1);
      return { position, velocity: dt > 0 ? (position - state.position) / dt : 0 };
    },
    isSettled: (state, target) => Math.abs(state.position - target) < 0.000001,
  };
}

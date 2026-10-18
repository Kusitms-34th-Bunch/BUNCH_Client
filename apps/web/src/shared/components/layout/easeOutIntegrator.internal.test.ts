import { describe, expect, it } from 'vitest';
import { easeOutIntegrator } from './easeOutIntegrator.internal';

describe('easeOutIntegrator', () => {
  it('200ms 동안 CSS ease-out 곡선으로 도착한다', () => {
    const integrator = easeOutIntegrator(200);
    let state = { position: 0, velocity: 0 };
    for (let frame = 0; frame < 6; frame++) state = integrator.step(state, 1, 1 / 60);
    expect(state.position).toBeCloseTo(0.68464, 4);
    expect(integrator.isSettled(state, 1)).toBe(false);
    for (let frame = 0; frame < 6; frame++) state = integrator.step(state, 1, 1 / 60);
    expect(integrator.isSettled(state, 1)).toBe(true);
    expect(state.position).toBeCloseTo(1, 6);
  });

  it('되돌리기와 도중 방향 전환에서도 범위를 벗어나지 않는다', () => {
    const integrator = easeOutIntegrator(200);
    let state = integrator.step({ position: 0, velocity: 0 }, 1, 0.1);
    state = integrator.step(state, 0, 0.1);
    expect(integrator.isSettled(state, 0)).toBe(true);
    state = integrator.step({ position: 1, velocity: 0 }, 0, 0.2);
    expect(state.position).toBe(0);
    expect(integrator.isSettled(state, 0)).toBe(true);
  });

  it('유효하지 않은 재생 시간을 거부한다', () => {
    for (const duration of [0, -1, NaN, Infinity])
      expect(() => easeOutIntegrator(duration)).toThrow(RangeError);
  });
});

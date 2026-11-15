import { describe, expect, it } from 'vitest';
import { cubicBezierIntegrator, easeOutIntegrator } from './easeOutIntegrator.internal';

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
    let state = { position: 0, velocity: 0 };
    for (let frame = 0; frame < 6; frame++) state = integrator.step(state, 1, 1 / 60);
    for (let frame = 0; frame < 12; frame++) state = integrator.step(state, 0, 1 / 60);
    expect(state.position).toBeCloseTo(0, 6);
    expect(integrator.isSettled(state, 0)).toBe(true);
  });

  it('유효하지 않은 재생 시간을 거부한다', () => {
    for (const duration of [0, -1, NaN, Infinity])
      expect(() => easeOutIntegrator(duration)).toThrow(RangeError);
  });
});

describe('cubicBezierIntegrator', () => {
  it('x1·x2가 0이 아닌 곡선도 정해진 시간의 절반에서 CSS cubic-bezier와 같은 값', () => {
    // Figma 피드 → 번들 상세 사진 이동 곡선(0.3, 0, 0.15, 1), 550ms
    const integrator = cubicBezierIntegrator(550, [0.3, 0, 0.15, 1]);
    // 275ms를 27.5ms 프레임 10번으로 진행
    let state = { position: 0, velocity: 0 };
    for (let frame = 0; frame < 10; frame++) state = integrator.step(state, 1, 0.0275);
    expect(state.position).toBeCloseTo(0.81909, 3);
    for (let frame = 0; frame < 10; frame++) state = integrator.step(state, 1, 0.0275);
    expect(integrator.isSettled(state, 1)).toBe(true);
  });

  it('0~1 밖의 제어점(되튀는 곡선)을 거부한다', () => {
    expect(() => cubicBezierIntegrator(300, [0.3, 0, 0.15, 1.5])).toThrow(RangeError);
    expect(() => cubicBezierIntegrator(300, [-0.1, 0, 0.15, 1])).toThrow(RangeError);
  });
});

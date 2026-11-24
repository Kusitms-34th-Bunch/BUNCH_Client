import { describe, expect, it } from 'vitest';
import { tabCrossfadeDirection, tabCrossfadeIntegrator } from './tabCrossfade';

type Args = Parameters<typeof tabCrossfadeDirection.animation>[0];
const owned = (owns: boolean) => ({ reason: 'finished' as const, owns: () => owns });

describe('tabCrossfadeIntegrator', () => {
  it('80ms 동안 같은 속도로 움직이고 목표에서 멈춘다', () => {
    const integrator = tabCrossfadeIntegrator();
    const start = { position: 0, velocity: 0 };

    expect(integrator.step(start, 1, 0.02).position).toBeCloseTo(0.25);
    expect(integrator.step({ position: 0.5, velocity: 0 }, 1, 0.02).position).toBeCloseTo(0.75);
    expect(integrator.step({ position: 0.9, velocity: 0 }, 1, 0.02).position).toBe(1);
    expect(integrator.step({ position: 0.1, velocity: 0 }, 0, 0.02).position).toBe(0);
    expect(integrator.isSettled({ position: 1, velocity: 0 }, 1)).toBe(true);
    expect(integrator.isSettled({ position: 0.99, velocity: 0 }, 1)).toBe(false);
  });
});

describe('tabCrossfadeDirection', () => {
  it('나가는 탭을 위로 올리고 들어오는 탭은 이전 전환 설정을 지운다', async () => {
    const from = document.createElement('div');
    const to = document.createElement('div');
    to.style.opacity = '0.4';
    to.style.pointerEvents = 'none';

    await tabCrossfadeDirection.prepare?.({
      from: Promise.resolve(from),
      to: Promise.resolve(to),
    } as never);

    expect(from.style.zIndex).toBe('2');
    expect(from.style.pointerEvents).toBe('none');
    expect(to.style.opacity).toBe('');
    expect(to.style.pointerEvents).toBe('');
    expect(to.style.position).toBe('relative');
    expect(to.style.zIndex).toBe('1');
  });

  it('정리 때 맡은 화면만 설정을 되돌린다', () => {
    const from = document.createElement('div');
    const to = document.createElement('div');
    Object.assign(from.style, { opacity: '0', zIndex: '2', pointerEvents: 'none' });
    Object.assign(to.style, { position: 'relative', zIndex: '1' });
    const animation = tabCrossfadeDirection.animation({
      from,
      to,
      prepared: {},
    } as unknown as Args);
    const out = animation.select('out').getMotionTracks()[0];
    const incoming = animation.select('in').getMotionTracks()[0];

    out?.onDispose?.(owned(false));
    incoming?.onDispose?.(owned(false));
    expect(from.style.zIndex).toBe('2');
    expect(to.style.position).toBe('relative');

    out?.onDispose?.(owned(true));
    incoming?.onDispose?.(owned(true));
    expect(from.style.opacity).toBe('');
    expect(from.style.zIndex).toBe('');
    expect(from.style.pointerEvents).toBe('');
    expect(to.style.position).toBe('');
    expect(to.style.zIndex).toBe('');
  });
});

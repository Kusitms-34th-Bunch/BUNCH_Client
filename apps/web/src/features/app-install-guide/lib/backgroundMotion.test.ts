import { describe, expect, it } from 'vitest';
import {
  ELLIPSES,
  LOOP_SECONDS,
  decodeDots,
  dotGroupFrame,
  ellipseFrame,
} from './backgroundMotion';
import { DOT_GROUPS } from './dotGroups';

describe('안내 화면 배경 움직임', () => {
  it('타원은 한 바퀴(12초) 뒤 처음 모습으로 돌아온다', () => {
    for (const ellipse of ELLIPSES) {
      const start = ellipseFrame(ellipse, 0);
      const end = ellipseFrame(ellipse, LOOP_SECONDS);
      expect(end.x).toBeCloseTo(start.x);
      expect(end.y).toBeCloseTo(start.y);
      expect(end.scale).toBeCloseTo(start.scale);
      expect(end.opacity).toBeCloseTo(start.opacity);
    }
  });

  it('타원 투명도는 스펙 범위 안에서만 움직인다', () => {
    for (let seconds = 0; seconds < LOOP_SECONDS; seconds += 0.25) {
      const { opacity } = ellipseFrame(ELLIPSES[0]!, seconds);
      expect(opacity).toBeGreaterThanOrEqual(0.55 - 1e-9);
      expect(opacity).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('점 묶음은 흐려졌다가 돌아오고, 1묶음은 첫 번째부터 세 번째로 흐려지는 사이에만 한 칸 옮겨 있다', () => {
    expect(dotGroupFrame(0, 0.55).opacity).toBeCloseTo(0.12);
    expect(dotGroupFrame(0, 1.4).opacity).toBeCloseTo(1);
    expect(dotGroupFrame(0, 0.5)).toMatchObject({ dx: 0, dy: 0 });
    expect(dotGroupFrame(0, 3)).toMatchObject({ dx: -10, dy: 0 });
    expect(dotGroupFrame(0, 8.9)).toMatchObject({ dx: 0, dy: 0 });
    // 2묶음은 움직이지 않음
    expect(dotGroupFrame(1, 4)).toMatchObject({ dx: 0, dy: 0 });
  });

  it('점 위치는 Figma와 같은 396개, 모두 10px 격자 칸의 가운데다', () => {
    const points = DOT_GROUPS.flatMap(decodeDots);
    expect(points).toHaveLength(396);
    expect(points.every(({ x, y }) => x % 10 === 5 && y % 10 === 5 && y < 200)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  circleSquare,
  moveCropRaw,
  resizeCropFromCornerRaw,
  rubberBand,
  clampCrop,
  fitScale,
  initialCrop,
  moveCrop,
  resizeCropBy,
  resizeCropFromCorner,
} from './photoCrop';

const LANDSCAPE = { width: 750, height: 504 };
const PORTRAIT = { width: 750, height: 1004 };

describe('photoCrop', () => {
  it('사진을 화면 폭에 맞춰 통째로 보이고, 아주 긴 세로 사진은 영역 높이에 맞춘다', () => {
    const stage = { width: 375, height: 600 };
    expect(fitScale(LANDSCAPE, stage)).toBe(0.5);
    expect(fitScale(PORTRAIT, stage)).toBe(0.5);
    expect(fitScale({ width: 375, height: 1200 }, stage)).toBe(0.5);
    // 영역을 모르거나 크기 없는 사진은 0
    expect(fitScale(LANDSCAPE, { width: 0, height: 600 })).toBe(0);
    expect(fitScale({ width: 0, height: 0 }, stage)).toBe(0);
  });

  it('처음 칸은 사진 폭 × 짧은 쪽(가로 사진은 사진 전체, 세로 사진은 가운데 정사각형)', () => {
    expect(initialCrop(LANDSCAPE)).toEqual({ x: 0, y: 0, width: 750, height: 504 });
    expect(initialCrop(PORTRAIT)).toEqual({ x: 0, y: 127, width: 750, height: 750 });
  });

  it('원은 칸의 짧은 쪽 크기로 칸 가운데에 들어간다', () => {
    expect(circleSquare({ x: 0, y: 0, width: 750, height: 504 })).toEqual({
      x: 123,
      y: 0,
      size: 504,
    });
    expect(circleSquare({ x: 10, y: 20, width: 200, height: 300 })).toEqual({
      x: 10,
      y: 70,
      size: 200,
    });
  });

  it('모서리를 좌우로 끌면 폭만, 위아래로 끌면 높이만, 대각선이면 둘 다 바뀐다', () => {
    const crop = { x: 0, y: 0, width: 750, height: 504 };
    const right = { x: 1, y: 1 } as const;
    // 오른쪽 아래를 왼쪽으로: 높이는 그대로
    expect(resizeCropFromCorner(crop, right, { x: 500, y: 504 }, LANDSCAPE, 0.5)).toEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 504,
    });
    // 위로: 폭은 그대로
    expect(resizeCropFromCorner(crop, right, { x: 750, y: 300 }, LANDSCAPE, 0.5)).toEqual({
      x: 0,
      y: 0,
      width: 750,
      height: 300,
    });
    // 왼쪽 위를 대각선 안쪽으로: 오른쪽 아래 고정
    expect(resizeCropFromCorner(crop, { x: -1, y: -1 }, { x: 100, y: 50 }, LANDSCAPE, 0.5)).toEqual(
      { x: 100, y: 50, width: 650, height: 454 },
    );
  });

  it('칸은 사진 밖으로 나가지 않고 한 변이 화면 80px(원본 160px)보다 작아지지 않는다', () => {
    const crop = { x: 100, y: 100, width: 200, height: 200 };
    expect(moveCrop(crop, { x: 1000, y: -1000 }, LANDSCAPE, 0.5)).toEqual({
      x: 550,
      y: 0,
      width: 200,
      height: 200,
    });
    expect(resizeCropFromCorner(crop, { x: 1, y: 1 }, { x: 0, y: 9999 }, LANDSCAPE, 0.5)).toEqual({
      x: 100,
      y: 100,
      width: 160,
      height: 404,
    });
    expect(
      clampCrop({ x: 0, y: 0, width: 10, height: 10 }, { width: 100, height: 60 }, 0.5),
    ).toEqual({ x: 0, y: 0, width: 100, height: 60 });
  });

  it('키보드 크기 조절은 가운데와 비율을 유지한다', () => {
    expect(resizeCropBy({ x: 100, y: 100, width: 400, height: 200 }, 0.9, LANDSCAPE, 0.5)).toEqual({
      x: 120,
      y: 110,
      width: 360,
      height: 180,
    });
  });

  it('키보드로 키울 때 한 변이 사진 끝에 닿으면 멈추고 비율을 지킨다', () => {
    // 높이가 이미 사진 높이(504)라 더 키우지 않음(폭만 늘지 않음)
    const tall = { x: 0, y: 0, width: 500, height: 504 };
    expect(resizeCropBy(tall, 1.1, LANDSCAPE, 0.5)).toEqual(tall);
    // 왼쪽 끝에 붙은 칸은 비율을 지킨 채 커지고 안쪽으로 밀림
    expect(resizeCropBy({ x: 0, y: 100, width: 400, height: 200 }, 1.25, LANDSCAPE, 0.5)).toEqual({
      x: 0,
      y: 75,
      width: 500,
      height: 250,
    });
    // 최소 크기(원본 160px)에서는 더 줄지 않음
    const small = { x: 0, y: 0, width: 200, height: 160 };
    expect(resizeCropBy(small, 1 / 1.1, LANDSCAPE, 0.5)).toEqual(small);
  });

  it('끝을 넘어 끌면 넘친 거리의 25%만 따라간다(고무줄)', () => {
    const crop = { x: 550, y: 0, width: 200, height: 200 };
    const raw = moveCropRaw(crop, { x: 100, y: 0 });
    const clamped = moveCrop(crop, { x: 100, y: 0 }, LANDSCAPE, 0.5);
    expect(clamped.x).toBe(550);
    expect(rubberBand(raw, clamped).x).toBe(575);
    // 모서리를 사진 밖으로: 폭이 끝(750)을 넘은 만큼의 25%
    const corner = { x: 1, y: 1 } as const;
    const point = { x: 900, y: 200 };
    const rawResize = resizeCropFromCornerRaw(crop, corner, point);
    const clampedResize = resizeCropFromCorner(crop, corner, point, LANDSCAPE, 0.5);
    expect(rubberBand(rawResize, clampedResize).width).toBe(200 + (350 - 200) * 0.25);
  });
});

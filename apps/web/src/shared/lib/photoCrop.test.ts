import { describe, expect, it } from 'vitest';
import { clampOffset, cropSourceRect, fitScale } from './photoCrop';

describe('photoCrop', () => {
  it('사진을 화면 폭에 맞추되 원보다 작아지지 않게 키운다', () => {
    expect(fitScale({ width: 750, height: 504 }, 375)).toBe(0.5);
    // 아주 넓은 사진은 높이가 원(252)을 덮도록
    expect(fitScale({ width: 2000, height: 252 }, 375)).toBe(1);
    // 작은 정사각 사진도 원을 덮도록
    expect(fitScale({ width: 100, height: 100 }, 375)).toBe(3.75);
  });

  it('원이 사진 밖으로 나가지 않게 이동을 제한한다', () => {
    // 375×252로 그려진 가로 사진: 가로로만 (375-252)/2 = 61.5까지
    expect(clampOffset({ x: 100, y: 40 }, { width: 750, height: 504 }, 0.5)).toEqual({
      x: 61.5,
      y: 0,
    });
    expect(clampOffset({ x: -20, y: 0 }, { width: 750, height: 504 }, 0.5)).toEqual({
      x: -20,
      y: 0,
    });
  });

  it('원이 덮는 원본 영역을 계산한다(사진을 오른쪽으로 옮기면 원은 왼쪽을 가리킴)', () => {
    const image = { width: 750, height: 504 };
    expect(cropSourceRect(image, 0.5, { x: 0, y: 0 })).toEqual({ x: 123, y: 0, size: 504 });
    expect(cropSourceRect(image, 0.5, { x: 61.5, y: 0 })).toEqual({ x: 0, y: 0, size: 504 });
  });
});

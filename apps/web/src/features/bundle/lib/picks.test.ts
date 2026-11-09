import { describe, expect, it } from 'vitest';
import { chunk, hasPicked, pickersOf, togglePick } from './picks';

describe('togglePick', () => {
  it('아직 픽하지 않은 사진이면 픽한 멤버에 더한다', () => {
    expect(togglePick({}, 'p1', 'jiye')).toEqual({ p1: ['jiye'] });
  });

  it('이미 픽했으면 해제하고, 다른 멤버와 다른 사진은 그대로 둔다', () => {
    const picks = { p1: ['jiye', 'suin'], p2: ['jiye'] };

    expect(togglePick(picks, 'p1', 'jiye')).toEqual({ p1: ['suin'], p2: ['jiye'] });
  });

  it('원본을 바꾸지 않는다', () => {
    const picks = { p1: ['jiye'] };
    togglePick(picks, 'p1', 'suin');

    expect(picks).toEqual({ p1: ['jiye'] });
  });
});

describe('pickersOf·hasPicked', () => {
  it('픽한 멤버가 없는 사진은 빈 목록이다', () => {
    expect(pickersOf({}, 'p1')).toEqual([]);
    expect(hasPicked({}, 'p1', 'jiye')).toBe(false);
  });

  it('내가 픽한 사진인지 안다', () => {
    expect(hasPicked({ p1: ['jiye'] }, 'p1', 'jiye')).toBe(true);
    expect(hasPicked({ p1: ['jiye'] }, 'p1', 'suin')).toBe(false);
  });
});

describe('chunk', () => {
  it('목록을 n개씩 끊는다', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
    expect(chunk([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]]);
    expect(chunk([], 4)).toEqual([]);
  });
});

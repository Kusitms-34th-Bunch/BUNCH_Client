import { describe, expect, it } from 'vitest';
import { chunk, hasPicked, pickersOf, withOwnPicks, withPick } from './picks';

describe('withPick', () => {
  it('아직 픽하지 않은 사진을 픽하면 픽한 멤버에 더한다', () => {
    expect(withPick({}, 'p1', 'jiye', true)).toEqual({ p1: ['jiye'] });
  });

  it('픽을 해제하면 그 멤버만 빼고, 다른 멤버와 다른 사진은 그대로 둔다', () => {
    const picks = { p1: ['jiye', 'suin'], p2: ['jiye'] };

    expect(withPick(picks, 'p1', 'jiye', false)).toEqual({ p1: ['suin'], p2: ['jiye'] });
  });

  it('이미 같은 상태면 같은 목록을 돌려준다', () => {
    const picks = { p1: ['jiye'] };

    expect(withPick(picks, 'p1', 'jiye', true)).toBe(picks);
    expect(withPick(picks, 'p1', 'suin', false)).toBe(picks);
  });

  it('원본을 바꾸지 않는다', () => {
    const picks = { p1: ['jiye'] };
    withPick(picks, 'p1', 'suin', true);

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

describe('withOwnPicks', () => {
  it('다른 멤버의 픽은 들어올 때 값으로 두고 내 픽만 지금 값으로 바꾼다', () => {
    const frozen = { p1: ['suin'], p2: ['jiye', 'suin'] };
    // 그사이 다른 멤버(eunwoo)가 p1을 픽하고 suin이 p2를 풀었지만 화면에는 반영하지 않음, 내가 p1 픽·p2 해제
    const live = { p1: ['suin', 'eunwoo', 'jiye'], p2: ['suin'] };

    expect(withOwnPicks(frozen, live, 'jiye')).toEqual({ p1: ['suin', 'jiye'], p2: ['suin'] });
  });

  it('들어올 때 없던 사진은 내 픽만 담는다', () => {
    expect(withOwnPicks({}, { p3: ['jiye'] }, 'jiye')).toEqual({ p3: ['jiye'] });
  });
});

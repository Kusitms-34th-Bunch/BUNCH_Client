import { describe, expect, it } from 'vitest';
import { copyTextOf, countByMember, filterByMember, sortByRecent } from './places';
import { ALL_MEMBERS, type KokPlace } from './types';

const place = (
  id: string,
  pickedBy: string | null,
  pickedAt: string,
  address?: string,
): KokPlace => ({
  id,
  name: `장소 ${id}`,
  address,
  pickedBy,
  pickedAt,
  source: { kind: 'pick' },
});

const PLACES = [
  place('a', 'eunwoo', '2026-11-01T10:00:00+09:00', '서울 종로구'),
  place('b', 'eunwoo', '2026-11-03T10:00:00+09:00'),
  place('c', 'suin', '2026-11-02T10:00:00+09:00'),
  place('left', null, '2026-10-01T10:00:00+09:00'),
];

describe('sortByRecent', () => {
  it('최근에 콕한 장소가 위로 오고 원본은 바꾸지 않는다', () => {
    expect(sortByRecent(PLACES).map((p) => p.id)).toEqual(['b', 'c', 'a', 'left']);
    expect(PLACES.map((p) => p.id)).toEqual(['a', 'b', 'c', 'left']);
  });
});

describe('countByMember', () => {
  it('전체와 멤버별 수를 세고, 나간 멤버의 장소는 전체에만 센다', () => {
    expect(countByMember(PLACES)).toEqual({ [ALL_MEMBERS]: 4, eunwoo: 2, suin: 1 });
  });

  it('장소가 없으면 전체 0이다', () => {
    expect(countByMember([])).toEqual({ [ALL_MEMBERS]: 0 });
  });
});

describe('filterByMember', () => {
  it('「전체」는 모두, 멤버는 그 멤버가 콕한 장소만 돌려준다', () => {
    expect(filterByMember(PLACES, ALL_MEMBERS)).toHaveLength(4);
    expect(filterByMember(PLACES, 'eunwoo').map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterByMember(PLACES, 'nobody')).toEqual([]);
  });
});

describe('copyTextOf', () => {
  it('주소가 있으면 주소, 없으면 장소 이름을 복사한다', () => {
    expect(copyTextOf(PLACES[0]!)).toBe('서울 종로구');
    expect(copyTextOf(PLACES[1]!)).toBe('장소 b');
  });
});

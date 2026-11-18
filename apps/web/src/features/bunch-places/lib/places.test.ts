import { describe, expect, it } from 'vitest';
import type { KokPlace } from './types';
import { copyTextOf } from './places';

const place = (address?: string): KokPlace => ({
  id: '1',
  name: '봄날카페',
  address,
  pickedBy: null,
  source: { kind: 'pick' },
});

describe('copyTextOf', () => {
  it('주소가 있으면 주소, 없으면 장소 이름을 복사한다', () => {
    expect(copyTextOf(place('서울 종로구'))).toBe('서울 종로구');
    expect(copyTextOf(place())).toBe('봄날카페');
  });
});

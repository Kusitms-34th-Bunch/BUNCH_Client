import { describe, expect, it } from 'vitest';
import type { KokPlace } from './types';
import { PLACES_MESSAGES } from '../constants/messages';
import { copyTextOf, placeSourceProps } from './places';

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

describe('placeSourceProps', () => {
  const withSource = (source: KokPlace['source']): KokPlace => ({ ...place(), source });

  it('번들에서 담아 온 장소는 번치 이름과 번들 제목을 보인다', () => {
    expect(
      placeSourceProps(
        withSource({
          kind: 'bundle',
          bunchId: 'b1',
          bundleId: 'u1',
          bunchName: '퇴근런',
          bundleTitle: '한강 코스',
        }),
      ),
    ).toEqual({ source: '퇴근런', bundleTitle: '한강 코스' });
  });

  it('광고와 볼 수 없는 번들은 번들 제목 없이 안내 문구만 보인다', () => {
    expect(placeSourceProps(withSource({ kind: 'pick' }))).toEqual({
      source: PLACES_MESSAGES.pickSource,
    });
    expect(placeSourceProps(withSource({ kind: 'unavailable' }))).toEqual({
      source: PLACES_MESSAGES.unavailableSource,
    });
  });
});

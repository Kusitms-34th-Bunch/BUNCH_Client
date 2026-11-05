import { describe, expect, it } from 'vitest';
import {
  getBirthYearMax,
  isBirthYearInRange,
  isCompleteBirthYear,
  isValidBirthYear,
  sanitizeBirthYear,
} from './birthYear';

describe('birthYear', () => {
  it('최대 연도는 현재 연도에서 14를 뺀 값이다', () => {
    expect(getBirthYearMax(2026)).toBe(2012);
    expect(getBirthYearMax(2027)).toBe(2013);
  });

  describe('sanitizeBirthYear', () => {
    it('숫자만 남긴다', () => {
      expect(sanitizeBirthYear('19a9-8')).toBe('1998');
    });

    it('4자리를 넘으면 앞 4자리만 남긴다', () => {
      expect(sanitizeBirthYear('199812')).toBe('1998');
    });
  });

  it('4자리일 때만 완성된 값으로 본다', () => {
    expect(isCompleteBirthYear('199')).toBe(false);
    expect(isCompleteBirthYear('1998')).toBe(true);
  });

  describe('isBirthYearInRange', () => {
    it('1930년부터 현재 연도 − 14년까지 포함한다', () => {
      expect(isBirthYearInRange('1930', 2026)).toBe(true);
      expect(isBirthYearInRange('2012', 2026)).toBe(true);
    });

    it('범위 밖이거나 4자리가 아니면 벗어난 것으로 본다', () => {
      expect(isBirthYearInRange('1929', 2026)).toBe(false);
      expect(isBirthYearInRange('2013', 2026)).toBe(false);
      expect(isBirthYearInRange('199', 2026)).toBe(false);
    });

    it('해가 바뀌면 최대 연도가 따라 바뀐다', () => {
      expect(isBirthYearInRange('2013', 2026)).toBe(false);
      expect(isBirthYearInRange('2013', 2027)).toBe(true);
    });
  });

  describe('isValidBirthYear', () => {
    it('선택 입력이라 비어 있으면 유효하다', () => {
      expect(isValidBirthYear('', 2026)).toBe(true);
    });

    it('값이 있으면 4자리이고 범위 안일 때만 유효하다', () => {
      expect(isValidBirthYear('1998', 2026)).toBe(true);
      expect(isValidBirthYear('199', 2026)).toBe(false);
      expect(isValidBirthYear('2020', 2026)).toBe(false);
    });
  });
});

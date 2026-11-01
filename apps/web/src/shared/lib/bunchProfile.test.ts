import { describe, expect, it } from 'vitest';
import { hasInvalidBunchNameChars } from './bunchProfile';

describe('hasInvalidBunchNameChars', () => {
  it('영문·숫자·완성형 한글만 허용한다', () => {
    expect(hasInvalidBunchNameChars('퇴근런Club24', false)).toBe(false);
    expect(hasInvalidBunchNameChars('퇴근 런', false)).toBe(true);
    expect(hasInvalidBunchNameChars('러닝!', false)).toBe(true);
  });

  it('조합 중에는 자모를 허용하고, 조합이 끝나면 막는다', () => {
    expect(hasInvalidBunchNameChars('퇴근ㄹ', true)).toBe(false);
    expect(hasInvalidBunchNameChars('퇴근ㄹ', false)).toBe(true);
  });
});

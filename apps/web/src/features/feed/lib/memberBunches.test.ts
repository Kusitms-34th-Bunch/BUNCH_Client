import { describe, expect, it } from 'vitest';
import { sortMemberBunches } from './memberBunches';

describe('sortMemberBunches', () => {
  it('한글 → 영문(대소문자 무시) → 숫자 순이고 원본을 바꾸지 않는다', () => {
    const bunches = ['365러닝', 'Beta', '하늘', 'zeta', '가람', 'alpha'].map((name) => ({ name }));

    expect(sortMemberBunches(bunches).map(({ name }) => name)).toEqual([
      '가람',
      '하늘',
      'alpha',
      'Beta',
      'zeta',
      '365러닝',
    ]);
    expect(bunches[0]?.name).toBe('365러닝');
  });
});

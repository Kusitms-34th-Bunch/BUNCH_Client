import { describe, expect, it } from 'vitest';
import { subjectParticle, withRo } from './josa';

describe('withRo', () => {
  it.each([
    ['여행가조', '여행가조로'],
    ['퇴근런클럽', '퇴근런클럽으로'],
    ['서울', '서울로'],
    ['BUNCH', 'BUNCH로'],
    ['123', '123로'],
  ])('%s → %s', (word, expected) => {
    expect(withRo(word)).toBe(expected);
  });
});

describe('subjectParticle', () => {
  it.each([
    ['애월 한담해변', '이'],
    ['제주 바다', '가'],
    ['서울', '이'],
    ['BUNCH', '가'],
  ])('%s → %s', (word, expected) => {
    expect(subjectParticle(word)).toBe(expected);
  });
});

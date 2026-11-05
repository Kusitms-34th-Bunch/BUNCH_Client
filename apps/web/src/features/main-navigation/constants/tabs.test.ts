import { describe, expect, it } from 'vitest';
import { findMainTab } from './tabs';

describe('findMainTab', () => {
  it('탭 경로와 그 하위 경로를 해당 탭으로 판정한다', () => {
    expect(findMainTab('/feed')).toBe('feed');
    expect(findMainTab('/bunch/1')).toBe('bunch');
  });

  it('접두어만 같은 경로나 탭 밖 경로는 null이다', () => {
    expect(findMainTab('/feedback')).toBeNull();
    expect(findMainTab('/')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { badgeColorOf, formatCommentDate } from './comments';

describe('comments', () => {
  it('번치 성격별 배지 색과 날짜 형식', () => {
    expect(badgeColorOf('TYPE_3')).toBe('pink');
    expect(badgeColorOf(undefined)).toBe('gray');
    expect(formatCommentDate(new Date(2026, 0, 5).getTime())).toBe('2026.01.05');
  });
});

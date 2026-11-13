import { describe, expect, it } from 'vitest';
import { formatElapsedTime } from './elapsedTime';

const now = new Date(2026, 6, 20, 12, 0).getTime();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

describe('formatElapsedTime', () => {
  it.each([
    [0, '방금 전'],
    [0.9, '방금 전'],
    [1, '1분 전'],
    [59, '59분 전'],
    [60, '1시간 전'],
    [23 * 60 + 59, '23시간 전'],
    [24 * 60, '1일 전'],
    [7 * 24 * 60 + 23 * 60, '7일 전'],
    [8 * 24 * 60 - 1, '7일 전'],
  ])('%d분 지나면 「%s」', (minutes, expected) => {
    expect(formatElapsedTime(ago(minutes), now)).toBe(expected);
  });

  it('8일부터는 발행 날짜', () => {
    expect(formatElapsedTime(ago(8 * 24 * 60), now)).toBe('2026년 7월 12일');
  });

  it('시계가 어긋나 미래 시각이면 「방금 전」', () => {
    expect(formatElapsedTime(ago(-5), now)).toBe('방금 전');
  });
});

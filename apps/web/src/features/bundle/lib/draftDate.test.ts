import { describe, expect, it } from 'vitest';
import { formatDraftDate, parseDraftDate, toDraftDateString } from './draftDate';

describe('draftDate', () => {
  it('YYYY-MM-DD를 기기 시간대의 그날 0시로 바꾼다', () => {
    const date = parseDraftDate('2026-06-20');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(20);
    expect(date?.getHours()).toBe(0);
  });

  it('형식이 틀리면 undefined를 돌려준다', () => {
    expect(parseDraftDate('6월 20일')).toBeUndefined();
    expect(parseDraftDate('2026-6-2')).toBeUndefined();
  });

  it('Date를 같은 형식 문자열로 되돌린다', () => {
    expect(toDraftDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('올해는 연도 없이, 올해가 아니면 연도를 붙인다', () => {
    expect(formatDraftDate('2026-06-20', 2026)).toBe('6월 20일');
    expect(formatDraftDate('2025-12-24', 2026)).toBe('2025년 12월 24일');
  });
});

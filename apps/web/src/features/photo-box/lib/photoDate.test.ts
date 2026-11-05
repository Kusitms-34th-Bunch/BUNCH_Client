import { describe, expect, it } from 'vitest';
import { filterByMember, formatSectionDate, getDateKey, splitPhotos } from './photoDate';
import { ALL_MEMBERS, type PhotoBoxPhoto } from './types';

const photo = (
  id: string,
  takenAt: string | null,
  uploadedAt = '2026-10-01T00:00:00',
  uploaderIds: string[] = ['a'],
): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt,
  uploadedAt,
  uploaderIds,
  status: 'ready',
});

describe('getDateKey', () => {
  it('촬영 시각에서 날짜 부분만 뽑는다', () => {
    expect(getDateKey('2026-09-27T14:10')).toBe('2026-09-27');
    expect(getDateKey('2026-09-27')).toBe('2026-09-27');
  });

  it('null이거나 형식이 맞지 않으면 null이다', () => {
    expect(getDateKey(null)).toBeNull();
    expect(getDateKey('')).toBeNull();
    expect(getDateKey('어제 오후')).toBeNull();
    expect(getDateKey('26-9-27')).toBeNull();
  });
});

describe('formatSectionDate', () => {
  it('올해는 월·일과 요일을 쓴다', () => {
    expect(formatSectionDate('2026-09-27', 2026)).toBe('9월 27일 일요일');
    expect(formatSectionDate('2026-09-26', 2026)).toBe('9월 26일 토요일');
  });

  it('월·일은 0을 붙이지 않는다', () => {
    expect(formatSectionDate('2026-01-05', 2026)).toBe('1월 5일 월요일');
  });

  it('올해가 아니면 연도를 쓰고 요일은 쓰지 않는다', () => {
    expect(formatSectionDate('2025-09-28', 2026)).toBe('2025년 9월 28일');
    expect(formatSectionDate('2027-01-01', 2026)).toBe('2027년 1월 1일');
  });

  it('해가 바뀌는 날의 경계를 연도로만 판단한다', () => {
    expect(formatSectionDate('2025-12-31', 2026)).toBe('2025년 12월 31일');
    expect(formatSectionDate('2026-01-01', 2026)).toBe('1월 1일 목요일');
  });
});

describe('filterByMember', () => {
  const photos = [
    photo('1', '2026-09-27T10:00', undefined, ['a']),
    photo('2', '2026-09-27T11:00', undefined, ['b']),
    photo('3', '2026-09-27T12:00', undefined, ['a', 'b']),
  ];

  it('전체는 모든 사진이다', () => {
    expect(filterByMember(photos, ALL_MEMBERS).map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('멤버를 고르면 그 멤버가 올린 사진이고, 함께 올린 사진은 올린 멤버 모두에게 보인다', () => {
    expect(filterByMember(photos, 'a').map((p) => p.id)).toEqual(['1', '3']);
    expect(filterByMember(photos, 'b').map((p) => p.id)).toEqual(['2', '3']);
  });

  it('올린 사진이 없는 멤버는 빈 목록이다', () => {
    expect(filterByMember(photos, 'c')).toEqual([]);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const copy = [...photos];
    filterByMember(photos, 'a');
    expect(photos).toEqual(copy);
  });
});

describe('splitPhotos', () => {
  it('날짜별 섹션을 최신 날짜가 위로 나눈다', () => {
    const { sections } = splitPhotos(
      [
        photo('old', '2026-09-20T10:00'),
        photo('new', '2026-09-27T10:00'),
        photo('mid', '2026-09-26T10:00'),
      ],
      2026,
    );

    expect(sections.map((s) => s.dateKey)).toEqual(['2026-09-27', '2026-09-26', '2026-09-20']);
    expect(sections.map((s) => s.label)).toEqual([
      '9월 27일 일요일',
      '9월 26일 토요일',
      '9월 20일 일요일',
    ]);
  });

  it('섹션 안은 최근 촬영이 앞이다', () => {
    const { sections } = splitPhotos(
      [
        photo('early', '2026-09-27T09:00'),
        photo('late', '2026-09-27T18:00'),
        photo('noon', '2026-09-27T12:00'),
      ],
      2026,
    );

    expect(sections[0]?.photos.map((p) => p.id)).toEqual(['late', 'noon', 'early']);
  });

  it('같은 촬영 시각이면 업로드 순이다', () => {
    const { sections } = splitPhotos(
      [
        photo('second', '2026-09-27T12:00', '2026-10-02T00:00:00'),
        photo('first', '2026-09-27T12:00', '2026-10-01T00:00:00'),
      ],
      2026,
    );

    expect(sections[0]?.photos.map((p) => p.id)).toEqual(['first', 'second']);
  });

  it('촬영 날짜가 없거나 형식이 틀린 사진은 섹션에 넣지 않고 업로드 최신순으로 따로 둔다', () => {
    const { sections, undated } = splitPhotos(
      [
        photo('dated', '2026-09-27T12:00'),
        photo('none-old', null, '2026-10-01T00:00:00'),
        photo('none-new', null, '2026-10-03T00:00:00'),
        photo('broken', '언젠가', '2026-10-02T00:00:00'),
      ],
      2026,
    );

    expect(sections).toHaveLength(1);
    expect(undated.map((p) => p.id)).toEqual(['none-new', 'broken', 'none-old']);
  });

  it('사진이 없으면 둘 다 빈 목록이다', () => {
    expect(splitPhotos([], 2026)).toEqual({ sections: [], undated: [] });
  });

  it('지난해 섹션은 연도를 붙인 제목이다', () => {
    const { sections } = splitPhotos([photo('p', '2025-12-24T19:30')], 2026);

    expect(sections[0]?.label).toBe('2025년 12월 24일');
  });
});

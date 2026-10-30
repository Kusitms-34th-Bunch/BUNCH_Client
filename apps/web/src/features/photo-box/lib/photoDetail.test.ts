import { describe, expect, it } from 'vitest';
import type { PhotoBoxMember, PhotoBoxPhoto } from './types';
import { formatDetailDate, getDetailOrder, getUploaders, parsePhotoId } from './photoDetail';

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

describe('parsePhotoId', () => {
  it('영문·숫자·밑줄·하이픈 64자 이하만 통과시킨다', () => {
    expect(parsePhotoId('photo-12')).toBe('photo-12');
    expect(parsePhotoId('a_B-9')).toBe('a_B-9');
    expect(parsePhotoId('x'.repeat(64))).toBe('x'.repeat(64));
  });

  it('비었거나 너무 길거나 허용하지 않는 문자가 있으면 undefined다', () => {
    expect(parsePhotoId('')).toBeUndefined();
    expect(parsePhotoId('x'.repeat(65))).toBeUndefined();
    expect(parsePhotoId('../etc')).toBeUndefined();
    expect(parsePhotoId('a b')).toBeUndefined();
    expect(parsePhotoId('사진')).toBeUndefined();
  });
});

describe('getDetailOrder', () => {
  it('최신 날짜 섹션이 먼저이고 섹션 안은 최근 촬영이 먼저다', () => {
    const order = getDetailOrder(
      [
        photo('old', '2026-09-20T10:00'),
        photo('new-early', '2026-09-27T09:00'),
        photo('new-late', '2026-09-27T18:00'),
      ],
      2026,
    ).map((p) => p.id);

    expect(order).toEqual(['new-late', 'new-early', 'old']);
  });

  it('촬영 날짜를 모르는 사진은 날짜 있는 사진 뒤에 업로드 최신순으로 붙는다', () => {
    const order = getDetailOrder(
      [
        photo('none-old', null, '2026-10-01T00:00:00'),
        photo('dated', '2026-09-27T10:00'),
        photo('none-new', null, '2026-10-03T00:00:00'),
      ],
      2026,
    ).map((p) => p.id);

    expect(order).toEqual(['dated', 'none-new', 'none-old']);
  });

  it('사진이 없으면 빈 목록이다', () => {
    expect(getDetailOrder([], 2026)).toEqual([]);
  });
});

describe('formatDetailDate', () => {
  it('올해는 월·일과 요일, 지난해는 연도를 붙인다', () => {
    expect(formatDetailDate('2026-08-16T10:00', 2026)).toBe('8월 16일 일요일');
    expect(formatDetailDate('2025-12-24T19:30', 2026)).toBe('2025년 12월 24일');
  });

  it('촬영 날짜를 모르거나 형식이 틀리면 「날짜 미확인」이다', () => {
    expect(formatDetailDate(null, 2026)).toBe('날짜 미확인');
    expect(formatDetailDate('어제', 2026)).toBe('날짜 미확인');
  });
});

describe('getUploaders', () => {
  const members: PhotoBoxMember[] = [
    { id: 'a', name: '은우' },
    { id: 'b', name: '경진' },
    { id: 'c', name: '수인' },
  ];

  it('올린 순서대로 멤버를 돌려준다', () => {
    expect(
      getUploaders(photo('p', null, undefined, ['b', 'a']), members).map((m) => m.name),
    ).toEqual(['경진', '은우']);
  });

  it('멤버 목록에 없는 id는 건너뛴다', () => {
    expect(
      getUploaders(photo('p', null, undefined, ['ghost', 'c']), members).map((m) => m.id),
    ).toEqual(['c']);
  });
});

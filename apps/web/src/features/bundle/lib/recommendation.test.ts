import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import {
  applyRecommendation,
  getApplyDateKey,
  getCardDate,
  groupByDate,
  parseRecommendationId,
  type Recommendation,
  type RecommendationDetail,
} from './recommendation';

const photo = (
  id: string,
  takenAt: string | null,
  status: PhotoBoxPhoto['status'] = 'ready',
): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt,
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds: ['a'],
  status,
});

const photos = [
  photo('p1', '2026-09-27T10:00'),
  photo('p2', '2026-09-27T09:00'),
  photo('p3', '2026-09-26T09:00'),
  photo('p4', null),
  photo('p5', '2026-09-26T08:00', 'processing'),
];

const detail = (ids: readonly string[]): RecommendationDetail => ({
  id: '1',
  title: '성수동 러닝 모임',
  photos: ids.flatMap((id) => photos.filter((item) => item.id === id)),
  originalSrcById: {},
  members: [],
});

const card = (startDate: string, endDate: string | null): Recommendation => ({
  id: '1',
  title: '성수동 러닝 모임',
  imageSrc: '/p1.jpg',
  memberNames: ['지예'],
  photoCount: 6,
  startDate,
  endDate,
});

describe('parseRecommendationId', () => {
  it('서버 숫자 id로 바꿀 수 있는 id만 통과한다', () => {
    expect(parseRecommendationId('31')).toBe('31');
    expect(parseRecommendationId('rec-1')).toBeUndefined();
    expect(parseRecommendationId('../secret')).toBeUndefined();
    expect(parseRecommendationId('0')).toBeUndefined();
    expect(parseRecommendationId('')).toBeUndefined();
  });
});

describe('applyRecommendation', () => {
  it('추천 순서대로 사진 id를 돌려준다', () => {
    expect(applyRecommendation(detail(['p2', 'p1']))).toEqual(['p2', 'p1']);
  });

  it('최대 장수를 넘으면 앞에서부터 자른다', () => {
    expect(applyRecommendation(detail(['p1', 'p2', 'p3']), 2)).toEqual(['p1', 'p2']);
  });
});

describe('getApplyDateKey', () => {
  it('첫 사진의 촬영일을 돌려준다', () => {
    expect(getApplyDateKey(detail(['p3', 'p1']))).toBe('2026-09-26');
  });

  it('첫 사진의 날짜를 모르거나 사진이 없으면 null이다', () => {
    expect(getApplyDateKey(detail(['p4', 'p1']))).toBeNull();
    expect(getApplyDateKey(detail([]))).toBeNull();
  });
});

describe('getCardDate', () => {
  it('올해 하루짜리는 월·일만 돌려준다', () => {
    expect(getCardDate(card('2026-10-17', null), 2026)).toEqual({ month: 10, day: 17 });
    expect(getCardDate(card('2026-10-17', '2026-10-17'), 2026)).toEqual({ month: 10, day: 17 });
  });

  it('자정을 넘긴 묶음은 끝 날짜를 함께 돌려준다', () => {
    expect(getCardDate(card('2026-10-19', '2026-10-20'), 2026)).toEqual({
      month: 10,
      day: 19,
      endMonth: 10,
      endDay: 20,
    });
  });

  it('올해가 아니면 연도를 함께 돌려준다', () => {
    expect(getCardDate(card('2025-12-31', '2026-01-01'), 2026)).toEqual({
      year: 2025,
      month: 12,
      day: 31,
      endMonth: 1,
      endDay: 1,
    });
  });
});

describe('groupByDate', () => {
  it('같은 촬영일끼리 묶되 날짜가 처음 나온 순서와 사진 순서를 지킨다', () => {
    const sections = groupByDate([photos[2]!, photos[0]!, photos[1]!], 2026);

    expect(sections.map((section) => section.dateKey)).toEqual(['2026-09-26', '2026-09-27']);
    expect(sections[1]?.photos.map((item) => item.id)).toEqual(['p1', 'p2']);
    expect(sections[0]?.label).toBe('9월 26일 토요일');
  });

  it('날짜를 모르는 사진은 맨 뒤 「날짜 미확인」에 모은다', () => {
    const sections = groupByDate([photos[3]!, photos[0]!], 2026);

    expect(sections.map((section) => section.label)).toEqual(['9월 27일 일요일', '날짜 미확인']);
  });
});

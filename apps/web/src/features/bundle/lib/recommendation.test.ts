import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import {
  applyRecommendation,
  getApplyDateKey,
  getRecommendationPhotos,
  groupByDate,
  parseRecommendationId,
  type Recommendation,
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

const recommendation = (photoIds: readonly string[]): Recommendation => ({
  id: 'rec',
  title: '성수동 러닝 모임',
  imageSrc: '/p1.jpg',
  memberNames: ['지예'],
  photoIds,
  month: 9,
  day: 27,
});

describe('parseRecommendationId', () => {
  it('허용 문자와 길이를 지킨 id만 통과한다', () => {
    expect(parseRecommendationId('rec-1_A')).toBe('rec-1_A');
    expect(parseRecommendationId('../secret')).toBeUndefined();
    expect(parseRecommendationId('')).toBeUndefined();
    expect(parseRecommendationId('x'.repeat(65))).toBeUndefined();
  });
});

describe('getRecommendationPhotos', () => {
  it('추천 순서를 지키고 사라졌거나 처리 중인 사진은 뺀다', () => {
    const result = getRecommendationPhotos(recommendation(['p3', 'gone', 'p1', 'p5']), photos);

    expect(result.map((item) => item.id)).toEqual(['p3', 'p1']);
  });
});

describe('applyRecommendation', () => {
  it('추천 순서대로 사진 id를 돌려준다', () => {
    expect(applyRecommendation(recommendation(['p2', 'p1']), photos)).toEqual(['p2', 'p1']);
  });

  it('사라진 사진은 빼서 남은 장수만큼만 선택한다', () => {
    expect(applyRecommendation(recommendation(['p1', 'gone', 'p3']), photos)).toEqual(['p1', 'p3']);
  });

  it('최대 장수를 넘으면 앞에서부터 자른다', () => {
    expect(applyRecommendation(recommendation(['p1', 'p2', 'p3']), photos, 2)).toEqual([
      'p1',
      'p2',
    ]);
  });
});

describe('getApplyDateKey', () => {
  it('첫 사진의 촬영일을 돌려준다', () => {
    expect(getApplyDateKey(recommendation(['p3', 'p1']), photos)).toBe('2026-09-26');
  });

  it('첫 사진의 날짜를 모르거나 사진이 없으면 null이다', () => {
    expect(getApplyDateKey(recommendation(['p4', 'p1']), photos)).toBeNull();
    expect(getApplyDateKey(recommendation(['gone']), photos)).toBeNull();
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

import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createBundle } from './bundles';
import { getRecommendation, getRecommendations } from './recommendations';

const bunchId = String(MOCK_BUNCH_ID);
const { S1, S2, P1, P2 } = MOCK_PHOTO_IDS;

const catchError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as { code?: string };
  }
  throw new Error('오류가 나야 함');
};

// 가짜 서버 응답에 기대는 테스트: 계약 모양 응답을 화면 모양으로 바꾸는지와 오류 코드를 함께 확인
describe('추천 번들 목록', () => {
  it('최근 사진이 있는 추천부터 카드 정보(문자열 id, 닉네임, 날짜, 대표 사진)로 돌려준다', async () => {
    const list = await getRecommendations(bunchId);

    expect(list.map((item) => item.title)).toEqual(['설악산 단풍 여행', '속초에서 보낸 주말']);
    expect(list[0]).toMatchObject({
      id: '1',
      imageSrc: '/mock/photos/S1.jpg',
      photoCount: 6,
      startDate: '2026-10-18',
      endDate: null,
    });
    // 올린 멤버: 많이 올린 순(경진 2장), 같으면 멤버 번호 순
    expect(list[0]?.memberNames[0]).toBe('경진');
    expect(list[0]?.memberNames).toHaveLength(5);
  });

  it('사진이 모두 지워진 추천은 목록에서 빠지고 일부만 지워지면 장수가 줄어든다', async () => {
    mockDb.update((state) => ({
      ...state,
      photos: state.photos.filter(
        (photo) => ![P1, P2, MOCK_PHOTO_IDS.P3, MOCK_PHOTO_IDS.P4, S1].includes(photo.photoId),
      ),
    }));

    const list = await getRecommendations(bunchId);

    expect(list.map((item) => item.title)).toEqual(['설악산 단풍 여행']);
    expect(list[0]?.photoCount).toBe(5);
    expect(list[0]?.imageSrc).toBe('/mock/photos/S2.jpg');
  });

  it('없는 번치는 RESOURCE_001이다', async () => {
    expect((await catchError(getRecommendations('999'))).code).toBe('RESOURCE_001');
  });
});

describe('추천 번들 상세', () => {
  it('적용될 순서(촬영 시각 순)의 사진과 올린 멤버를 화면 모양으로 돌려준다', async () => {
    const detail = await getRecommendation(bunchId, '2');

    expect(detail.title).toBe('속초에서 보낸 주말');
    expect(detail.photos.map((photo) => photo.id)).toEqual(
      [MOCK_PHOTO_IDS.P1, MOCK_PHOTO_IDS.P2, MOCK_PHOTO_IDS.P3, MOCK_PHOTO_IDS.P4].map(String),
    );
    expect(detail.photos[0]).toMatchObject({
      takenAt: '2026-10-17T07:05',
      src: '/mock/photos/P1-thumb.jpg',
      status: 'ready',
    });
    expect(detail.photos[0]?.uploaderIds).toHaveLength(1);
    expect(detail.members.length).toBeGreaterThan(0);
    expect(detail.members[0]?.name).toBeTruthy();
  });

  it('지워진 사진은 빠지고, 날짜를 지운 사진도 빠진다', async () => {
    mockDb.update((state) => ({
      ...state,
      photos: state.photos
        .filter((photo) => photo.photoId !== S2)
        .map((photo) =>
          photo.photoId === S1 ? { ...photo, capturedDate: null, capturedTime: null } : photo,
        ),
    }));

    const detail = await getRecommendation(bunchId, '1');

    expect(detail.photos).toHaveLength(4);
    expect(detail.photos.map((photo) => photo.id)).not.toContain(String(S1));
    expect(detail.photos.map((photo) => photo.id)).not.toContain(String(S2));
  });

  it('삭제됐거나 없는 추천은 RESOURCE_001이고 서버 숫자가 아닌 id는 요청 없이 막는다', async () => {
    expect((await catchError(getRecommendation(bunchId, '77'))).code).toBe('RESOURCE_001');
    const invalid = await catchError(getRecommendation(bunchId, 'rec-1'));
    expect(invalid).toBeInstanceOf(Error);
  });
});

describe('추천 번들로 초안 만들기', () => {
  it('추천 id를 함께 보내면 기본 제목이 추천 제목이 된다', async () => {
    const draft = await createBundle(
      bunchId,
      [String(S1), String(S2)],
      createIdempotencyKey(),
      ['2'],
      '1',
    );

    expect(draft.title).toBe('설악산 단풍 여행');
  });

  it('추천 id가 없으면 제목은 비어 있고 없는 추천이면 RESOURCE_001이다', async () => {
    const plain = await createBundle(bunchId, [String(S1)], createIdempotencyKey(), ['2']);
    expect(plain.title).toBe('');

    const error = await catchError(
      createBundle(bunchId, [String(S1)], createIdempotencyKey(), ['2'], '77'),
    );
    expect(error.code).toBe('RESOURCE_001');
  });
});

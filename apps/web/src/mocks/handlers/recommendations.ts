import { http } from 'msw';
import { toWireId } from '@/shared/api/client/ids';
import type { MockPhoto } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '../db/seed';
import { fail, ok } from '../lib/envelope';

// ID 1·2는 이 가짜 서버가 정한 값(서버 규칙 아님)
// 서버가 계산하는 추천 번들(사진 묶기·제목 생성)을 흉내 낸 고정 묶음. 사진이 지워지거나 날짜를 잃으면 그 사진만 빠지고, 하나도 안 남으면 사라짐
// 실제 서버는 사진 6~10장을 담고 사진이 바뀌면 몇 분 뒤 다시 계산하지만, 가짜 서버는 요청마다 지금 사진함에서 바로 구함
const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    title: '설악산 단풍 여행',
    photoIds: [
      MOCK_PHOTO_IDS.S1,
      MOCK_PHOTO_IDS.S2,
      MOCK_PHOTO_IDS.S3,
      MOCK_PHOTO_IDS.S4,
      MOCK_PHOTO_IDS.S5,
      MOCK_PHOTO_IDS.S6,
    ],
  },
  {
    id: 2,
    title: '속초에서 보낸 주말',
    photoIds: [MOCK_PHOTO_IDS.P1, MOCK_PHOTO_IDS.P2, MOCK_PHOTO_IDS.P3, MOCK_PHOTO_IDS.P4],
  },
];

type MockRecommendation = { id: number; title: string; photos: MockPhoto[] };

// 날짜를 아는 사진만(명세: 날짜를 지운 사진은 추천에서 빠짐), 사진이 하나도 없으면 없는 추천
const resolve = (bunchId: number): MockRecommendation[] => {
  const { photos } = mockDb.get();
  return MOCK_RECOMMENDATIONS.flatMap((recommendation) => {
    const kept = recommendation.photoIds.flatMap((photoId) => {
      const photo = photos.find((item) => item.bunchId === bunchId && item.photoId === photoId);
      return photo && photo.capturedDate !== null ? [photo] : [];
    });
    return kept.length > 0
      ? [{ id: recommendation.id, title: recommendation.title, photos: kept }]
      : [];
  });
};

/** 초안 생성이 추천 번들을 연결할 때 기본 제목으로 씀. 없으면 undefined */
export const findMockRecommendationTitle = (bunchId: number, id: number) =>
  resolve(bunchId).find((recommendation) => recommendation.id === id)?.title;

const uploaderOf = (memberId: number) => {
  const member = mockDb.get().members.find((item) => item.memberId === memberId);
  return { memberId, nickname: member?.nickname ?? null, imageUrl: member?.imageUrl ?? null };
};

// 번치 접근 검사(없는 번치 404, 활성 멤버가 아니면 AUTH_002)
const checkAccess = (bunchIdParam: string | readonly string[] | undefined) => {
  const bunchId = toWireId(bunchIdParam);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const { bunches, memberships } = mockDb.get();
  if (!bunches.some((bunch) => bunch.id === bunchId)) return { error: fail(404, 'RESOURCE_001') };
  const mine = memberships.some(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  );
  return mine ? { bunchId } : { error: fail(403, 'AUTH_002') };
};

const toCard = ({ id, title, photos }: MockRecommendation) => {
  const dates = photos.flatMap((photo) => (photo.capturedDate ? [photo.capturedDate] : [])).sort();
  const startDate = dates[0] ?? '';
  const last = dates[dates.length - 1] ?? startDate;
  // 많이 올린 멤버 순, 같으면 멤버 번호 순
  const counts = new Map<number, number>();
  for (const photo of photos) {
    for (const memberId of photo.uploaderIds) counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
  }
  const uploaderIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([memberId]) => memberId);
  return {
    id,
    title,
    startDate,
    // 자정을 넘겨 이은 묶음만 끝 날짜가 있음
    endDate: last !== startDate ? last : null,
    photoCount: photos.length,
    uploaders: uploaderIds.map(uploaderOf),
    coverImageUrl: photos[0]?.imageUrl ?? '',
  };
};

export const recommendationHandlers = [
  // GET /api/v1/bunches/{bunchId}/recommended-bundles: 마지막 사진이 최근에 추가된(촬영이 늦은) 순
  http.get('/api/bunches/:bunchId/recommended-bundles', ({ params }) => {
    const access = checkAccess(params.bunchId);
    if (access.error) return access.error;
    const newest = (recommendation: MockRecommendation) =>
      recommendation.photos.reduce((latest, photo) => {
        const at = `${photo.capturedDate ?? ''}T${photo.capturedTime ?? ''}`;
        return at > latest ? at : latest;
      }, '');
    const bundles = resolve(access.bunchId)
      .sort((a, b) => newest(b).localeCompare(newest(a)))
      .map(toCard);
    return ok({ bundles });
  }),

  // GET /api/v1/bunches/{bunchId}/recommended-bundles/{id}: 적용될 순서(촬영 시각 순)의 최신 사진
  http.get('/api/bunches/:bunchId/recommended-bundles/:id', ({ params }) => {
    const access = checkAccess(params.bunchId);
    if (access.error) return access.error;
    const id = toWireId(params.id);
    if (id === undefined) return fail(400, 'COMMON_001');
    const recommendation = resolve(access.bunchId).find((item) => item.id === id);
    if (!recommendation) return fail(404, 'RESOURCE_001');
    const photos = [...recommendation.photos].sort(
      (a, b) =>
        (a.capturedDate ?? '').localeCompare(b.capturedDate ?? '') ||
        (a.capturedTime ?? '24').localeCompare(b.capturedTime ?? '24') ||
        a.photoId - b.photoId,
    );
    return ok({
      id: recommendation.id,
      title: recommendation.title,
      photos: photos.map((photo) => ({
        photoId: photo.photoId,
        thumbnailUrl: photo.thumbnailUrl,
        imageUrl: photo.imageUrl,
        capturedDate: photo.capturedDate ?? '',
        capturedTime: photo.capturedTime,
        uploaders: photo.uploaderIds.map(uploaderOf),
      })),
    });
  }),
];

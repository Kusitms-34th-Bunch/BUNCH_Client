import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import { recommendationDetailSchema, toRecommendationDetail } from './recommendation';

const photo = (photoId: number, uploaders: { memberId: number; imageUrl?: string | null }[]) => ({
  photoId,
  thumbnailUrl: `/mock/photos/${photoId}-thumb.webp`,
  imageUrl: `/mock/photos/${photoId}.webp`,
  capturedDate: '2026-10-17',
  capturedTime: '07:05:00',
  uploaders: uploaders.map((uploader) => ({ nickname: `멤버${uploader.memberId}`, ...uploader })),
});

describe('toRecommendationDetail', () => {
  it('사진이 없거나 안전하지 않은 주소의 업로더는 기본 프로필 이미지로 둔다', () => {
    const detail = toRecommendationDetail(
      recommendationDetailSchema.parse({
        id: 1,
        title: '속초에서 보낸 주말',
        photos: [
          photo(10, [
            { memberId: 1, imageUrl: '/mock/avatars/1.jpg' },
            { memberId: 2, imageUrl: null },
          ]),
          photo(11, [{ memberId: 3, imageUrl: 'javascript:alert(1)' }]),
        ],
      }),
    );

    expect(detail.members.map(({ id, avatarSrc }) => ({ id, avatarSrc }))).toEqual([
      { id: '1', avatarSrc: '/mock/avatars/1.jpg' },
      { id: '2', avatarSrc: DEFAULT_PROFILE_IMAGE },
      { id: '3', avatarSrc: DEFAULT_PROFILE_IMAGE },
    ]);
  });
});

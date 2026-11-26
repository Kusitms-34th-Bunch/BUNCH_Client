import { describe, expect, it } from 'vitest';
import { datedPhotosPageSchema, toDatedPhotoBoxPhoto } from './photos';

const page = (size: Record<string, unknown>) =>
  datedPhotosPageSchema.parse({
    totalCount: 1,
    photos: [
      {
        photoId: 1,
        thumbnailUrl: 'https://cdn.example.com/1.jpg',
        capturedDate: '2026-11-26',
        uploaderIds: [1],
        usedInDraftBundle: false,
        ...size,
      },
    ],
  }).photos[0]!;

describe('사진 원본 비율(#583)', () => {
  it('서버가 준 원본 width·height로 가로/세로 비율을 만든다', () => {
    expect(toDatedPhotoBoxPhoto(page({ width: 3000, height: 4000 })).aspectRatio).toBe(0.75);
  });

  it('크기가 없거나 잘못된 옛 사진은 비율 없이(목록 전체가 실패하지 않게) 받는다', () => {
    expect(toDatedPhotoBoxPhoto(page({})).aspectRatio).toBeUndefined();
    expect(toDatedPhotoBoxPhoto(page({ width: null, height: null })).aspectRatio).toBeUndefined();
    expect(toDatedPhotoBoxPhoto(page({ width: 0, height: -1 })).aspectRatio).toBeUndefined();
  });
});

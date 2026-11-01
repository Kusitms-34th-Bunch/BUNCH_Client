import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import type { Recommendation } from '../lib/recommendation';

// 추천 번들 API 연결 전 샘플: 사진함 샘플 사진을 추천 순서대로 나눠 담음(번들명은 기획의 제목 생성 로직이 내려줄 값)
const ready: readonly PhotoBoxPhoto[] = photoBoxFixture.photos.filter(
  (photo) => photo.status === 'ready' && photo.takenAt !== null,
);

const dateOf = (photo: PhotoBoxPhoto | undefined) => {
  const [, month = 1, day = 1] = (photo?.takenAt?.slice(0, 10) ?? '').split('-').map(Number);
  return { month, day };
};

const recommendation = (
  id: string,
  title: string,
  memberNames: readonly string[],
  photos: readonly PhotoBoxPhoto[],
): Recommendation => ({
  id,
  title,
  imageSrc: photos[0]?.src ?? '',
  memberNames,
  photoIds: photos.map((photo) => photo.id),
  ...dateOf(photos[0]),
});

export const recommendationFixture: readonly Recommendation[] = [
  recommendation(
    'rec-1',
    '성수동 러닝 모임',
    ['지예', '경진', '수인', '은우', '경준'],
    ready.slice(0, 6),
  ),
  recommendation(
    'rec-2',
    '성수동 러닝 모임',
    ['지예', '경진', '수인', '은우', '경준', '효찬', '다온'],
    ready.slice(3, 9),
  ),
];

import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { bundleDetailSchema, toFeedBundleDetail, toFeedBunch } from './bundleDetail';

const person = (memberId: number | null, nickname: string, profileAvailable = true) => ({
  memberId,
  nickname,
  imageUrl: null,
  profileAvailable,
});

// 사진·장소 순서를 뒤섞고, 안전하지 않은 사진 주소와 이용할 수 없는 멤버를 넣은 응답
const response = bundleDetailSchema.parse({
  id: 7,
  bunchId: 3,
  title: '여름밤 바닷가 캠핑',
  date: '2026-08-15',
  publishedAt: null,
  photos: [
    { id: 2, imageUrl: '/mock/photos/P2.jpg', position: 1, picks: null },
    { id: 3, imageUrl: 'javascript:alert(1)', position: 2 },
    {
      id: 1,
      imageUrl: '/mock/photos/P1.jpg',
      position: 0,
      picks: { members: [person(1, '은우'), person(null, '작성자', false)] },
    },
  ],
  contributors: [person(1, '은우'), person(null, '작성자', false)],
  comments: [
    { ...person(1, '은우'), id: 11, content: '좋았어요' },
    { ...person(null, '작성자', false), id: 12, content: '삭제된 코멘트입니다' },
  ],
  locations: [
    { id: 22, name: '한라산', address: null, position: 1 },
    { id: 21, name: '애월 한담해변', address: '제주시', position: 0 },
  ],
  visibility: 'PUBLIC',
  permissions: { canEdit: false, canDelete: true, canReport: false, canLike: true },
  likeCount: 3,
  likedByCurrentBunch: true,
  commentCount: 5,
});

describe('toFeedBundleDetail', () => {
  const bunch = toFeedBunch({ id: 3, name: '캠핑러버', characterType: 'TYPE_2' });
  const detail = toFeedBundleDetail(response, bunch);

  it('사진·장소를 position 순으로 두고, 안전하지 않은 사진 주소는 뺀다', () => {
    expect(detail.photos.map((photo) => photo.src)).toEqual([
      '/mock/photos/P1.jpg',
      '/mock/photos/P2.jpg',
    ]);
    expect(detail.location).toBe('애월 한담해변 외 1곳');
    expect(detail.places.map((place) => place.name)).toEqual(['애월 한담해변', '한라산']);
    expect(detail.date).toBe('2026년 8월 15일');
  });

  it('이용할 수 없는 멤버는 이름·이미지·코멘트 없이 나간 멤버로 둔다', () => {
    expect(detail.members).toEqual([
      { id: '1', name: '은우', imageSrc: DEFAULT_PROFILE_IMAGE },
      { name: '', left: true },
    ]);
    expect(detail.memberComments[1]).toEqual({ id: '12', name: '', comment: '', left: true });
    expect(detail.photos[0]?.pickers).toEqual([
      { name: '은우', imageSrc: DEFAULT_PROFILE_IMAGE },
      { name: '' },
    ]);
  });

  it('권한은 항목별로, 수는 서버 값으로, 발행 시각이 없으면 빈 값', () => {
    expect(detail).toMatchObject({
      canEdit: false,
      canDelete: true,
      canReport: false,
      likeCount: 3,
      liked: true,
      commentCount: 5,
      memberOnly: false,
      publishedAt: '',
      comments: [],
    });
    expect(detail.bunch).toMatchObject({ id: '3', name: '캠핑러버' });
  });
});

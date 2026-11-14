import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { defaultBunchImage, DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { FeedAd, FeedBundle } from '../lib/types';

export const imageOrUndefined = (url: string | null | undefined) =>
  url && isSafeImageUrl(url) ? url : undefined;

// 응답 모양은 Swagger 생성 타입 FeedResponse·AdvertisementResponse(중첩 선택 필드가 있어 ApiContract로 묶지 않음)
const placeSchema = z.object({
  provider: z.string(),
  externalId: z.string(),
  name: z.string(),
  address: z.string().nullish(),
});

const advertisementSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  introduction: z.string(),
  photoUrl: z.string(),
  tags: z.array(z.string()),
  externalLink: z.string().nullish(),
  place: placeSchema,
  pinned: z.boolean(),
  pinId: z.number().int().positive().nullish(),
  canPin: z.boolean(),
});

const bundleCardSchema = z.object({
  id: z.number().int().positive(),
  bunch: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    imageUrl: z.string().nullish(),
    characterType: z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
  }),
  publishedAt: z.string(),
  title: z.string(),
  date: z.string().nullish(),
  coverImageUrl: z.string().nullish(),
  photos: z.array(
    z.object({
      id: z.number().int().positive(),
      imageUrl: z.string(),
      position: z.number().int(),
    }),
  ),
  locations: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      address: z.string().nullish(),
      position: z.number().int(),
    }),
  ),
  participants: z.array(
    z.object({
      memberId: z.number().int().positive().nullish(),
      nickname: z.string().nullish(),
      imageUrl: z.string().nullish(),
      profileAvailable: z.boolean(),
    }),
  ),
  likeCount: z.number().int().nonnegative(),
  likedByCurrentBunch: z.boolean(),
  commentCount: z.number().int().nonnegative(),
});

// 항목 type은 Swagger에서 정해진 목록이 아닌 문자열이라, 모르는 type은 통과시킨 뒤 변환에서 건너뜀
const feedItemSchema = z.union([
  z.object({
    type: z.literal('BUNDLE'),
    segment: z.enum(['FOLLOWING', 'PUBLIC']),
    bundle: bundleCardSchema,
  }),
  z.object({ type: z.literal('ADVERTISEMENT'), advertisement: advertisementSchema }),
  z.object({ type: z.string().refine((type) => type !== 'BUNDLE' && type !== 'ADVERTISEMENT') }),
]);

/** `GET /feed` 응답 한 쪽(Swagger `FeedResponse`, 커서·구간 규칙은 명세 025) */
export const feedPageSchema = z.object({
  anchorTime: z.string(),
  currentBunchId: z.number().int().positive().nullish(),
  canInteract: z.boolean(),
  size: z.number().int().nonnegative(),
  bundleCount: z.number().int().nonnegative(),
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullish(),
  hasNext: z.boolean(),
  endReached: z.boolean(),
});
export type FeedPage = z.infer<typeof feedPageSchema>;

/** 화면이 그리는 피드 한 줄: 번들 카드, 광고 카드, 팔로우 구간 끝 안내 */
export type FeedEntry =
  | { kind: 'bundle'; segment: 'FOLLOWING' | 'PUBLIC'; bundle: FeedBundle }
  | { kind: 'ad'; key: string; ad: FeedAd }
  | { kind: 'followingDone' };

/** 「2026년 7월 9일」(번들 날짜는 올해도 연도를 붙임, 기능명세서 6.2.3) */
export const toDateLabel = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
};

/** 「{첫 장소} 외 N곳」 */
export const toLocationLabel = (names: readonly string[]) =>
  names.length === 0
    ? undefined
    : names.length === 1
      ? names[0]
      : `${names[0]} 외 ${names.length - 1}곳`;

type BundleCard = z.infer<typeof bundleCardSchema>;

export const toFeedBundle = (card: BundleCard): FeedBundle => {
  const locations = [...card.locations].sort((a, b) => a.position - b.position);
  return {
    id: toDomainId(card.id),
    bunch: {
      id: toDomainId(card.bunch.id),
      name: card.bunch.name,
      imageSrc:
        imageOrUndefined(card.bunch.imageUrl) ?? defaultBunchImage(card.bunch.characterType),
    },
    publishedAt: card.publishedAt,
    title: card.title,
    location: toLocationLabel(locations.map((location) => location.name)),
    // ponytail: 피드 응답에는 콕 여부가 없어 모두 「콕하기」, 장소 콕 API 연결(API 연동 8번) 때 받아 옴
    places: locations.map((location) => ({
      id: toDomainId(location.id),
      name: location.name,
      address: location.address ?? undefined,
      picked: false,
    })),
    date: card.date ? toDateLabel(card.date) : undefined,
    photos: [...card.photos]
      .sort((a, b) => a.position - b.position)
      .flatMap((photo) => (isSafeImageUrl(photo.imageUrl) ? [{ src: photo.imageUrl }] : [])),
    members: card.participants.map((member) =>
      member.profileAvailable
        ? {
            id: member.memberId ? toDomainId(member.memberId) : undefined,
            name: member.nickname ?? '',
            imageSrc: imageOrUndefined(member.imageUrl) ?? DEFAULT_PROFILE_IMAGE,
          }
        : { name: '', left: true },
    ),
    liked: card.likedByCurrentBunch,
    likeCount: card.likeCount,
    commentCount: card.commentCount,
  };
};

// 광고 이름은 카드 제목, 소개는 홍보 문구, 위치는 주소(주소 없는 지역은 장소 이름)
export const toFeedAd = (ad: z.infer<typeof advertisementSchema>): FeedAd => ({
  id: toDomainId(ad.id),
  title: ad.name,
  imageSrc: imageOrUndefined(ad.photoUrl) ?? '',
  logoSrc: '/images/feed/bunch-spot-logo.svg',
  tagline: ad.introduction,
  location: ad.place.address ?? ad.place.name,
  tags: ad.tags,
  picked: ad.pinned,
});

/**
 * 받은 쪽들을 화면 순서대로 펼침(모르는 type·사진 없는 광고는 건너뜀)
 * 같은 광고가 여러 자리에 올 수 있어 광고 key는 광고 ID와 받은 자리(쪽·순번)로 정함
 */
export const toFeedEntries = (pages: readonly FeedPage[]): FeedEntry[] =>
  pages.flatMap((page, pageIndex) =>
    page.items.flatMap((item, itemIndex): FeedEntry[] => {
      if ('bundle' in item) {
        return [{ kind: 'bundle', segment: item.segment, bundle: toFeedBundle(item.bundle) }];
      }
      if ('advertisement' in item) {
        const ad = toFeedAd(item.advertisement);
        return ad.imageSrc
          ? [{ kind: 'ad', key: `ad-${ad.id}-${pageIndex}-${itemIndex}`, ad }]
          : [];
      }
      return item.type === 'FOLLOWING_CAUGHT_UP' ? [{ kind: 'followingDone' }] : [];
    }),
  );

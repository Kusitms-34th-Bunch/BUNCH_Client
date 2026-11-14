import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import {
  type CharacterType,
  defaultBunchImage,
  DEFAULT_PROFILE_IMAGE,
} from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { FeedBunch, FeedBundleDetail } from '../lib/types';
import { imageOrUndefined, toDateLabel, toLocationLabel } from './feed';

// 응답 모양은 Swagger 생성 타입 BunchPublicBundleDetail(중첩 선택 필드가 있어 ApiContract로 묶지 않음), 표시 규칙은 명세 084
// 이용할 수 없는 멤버(profileAvailable false)는 memberId가 비어 올 수 있어 받아 둠(화면은 쓰지 않음)
const personSchema = z.object({
  memberId: z.number().int().positive().nullish(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  profileAvailable: z.boolean(),
});

export const bundleDetailSchema = z.object({
  id: z.number().int().positive(),
  bunchId: z.number().int().positive(),
  title: z.string(),
  date: z.string().nullish(),
  publishedAt: z.string().nullish(),
  photos: z.array(
    z.object({
      id: z.number().int().positive(),
      imageUrl: z.string(),
      position: z.number().int(),
      picks: z.object({ members: z.array(personSchema) }).nullish(),
    }),
  ),
  contributors: z.array(personSchema),
  comments: z.array(
    personSchema.extend({ id: z.number().int().positive(), content: z.string().nullish() }),
  ),
  locations: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      address: z.string().nullish(),
      position: z.number().int(),
    }),
  ),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).nullish(),
  permissions: z.object({
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canReport: z.boolean(),
  }),
  likeCount: z.number().int().nonnegative(),
  likedByCurrentBunch: z.boolean(),
  commentCount: z.number().int().nonnegative(),
});
export type BundleDetailResponse = z.infer<typeof bundleDetailSchema>;

/** 상세 위 번치 이름·이미지(발행 번들 상세에는 없어 route가 번치 홈 응답의 `bunch`를 넘김) */
export type BundleBunchSource = {
  id: number;
  name: string;
  imageUrl?: string | null | undefined;
  characterType: CharacterType;
};

export const toFeedBunch = (bunch: BundleBunchSource): FeedBunch => ({
  id: toDomainId(bunch.id),
  name: bunch.name,
  imageSrc: imageOrUndefined(bunch.imageUrl) ?? defaultBunchImage(bunch.characterType),
});

const avatarOf = (person: { imageUrl?: string | null | undefined }) =>
  imageOrUndefined(person.imageUrl) ?? DEFAULT_PROFILE_IMAGE;

export const toFeedBundleDetail = (
  detail: BundleDetailResponse,
  bunch: FeedBunch,
): FeedBundleDetail => {
  const locations = [...detail.locations].sort((a, b) => a.position - b.position);
  return {
    id: toDomainId(detail.id),
    bunch,
    publishedAt: detail.publishedAt ?? '',
    title: detail.title,
    location: toLocationLabel(locations.map((location) => location.name)),
    // ponytail: 상세 응답에도 콕 여부가 없어 모두 「콕하기」, 장소 콕 API 연결(API 연동 8번) 때 받아 옴
    places: locations.map((location) => ({
      id: toDomainId(location.id),
      name: location.name,
      address: location.address ?? undefined,
      picked: false,
    })),
    date: detail.date ? toDateLabel(detail.date) : undefined,
    photos: [...detail.photos]
      .sort((a, b) => a.position - b.position)
      .flatMap((photo) =>
        isSafeImageUrl(photo.imageUrl)
          ? [
              {
                src: photo.imageUrl,
                pickers: (photo.picks?.members ?? []).map((member) =>
                  member.profileAvailable
                    ? { name: member.nickname ?? '', imageSrc: avatarOf(member) }
                    : { name: '' },
                ),
              },
            ]
          : [],
      ),
    members: detail.contributors.map((member) =>
      member.profileAvailable
        ? {
            id: member.memberId ? toDomainId(member.memberId) : undefined,
            name: member.nickname ?? '',
            imageSrc: avatarOf(member),
          }
        : { name: '', left: true },
    ),
    liked: detail.likedByCurrentBunch,
    likeCount: detail.likeCount,
    commentCount: detail.commentCount,
    // ponytail: 외부 상세(084)는 멤버 공개(PRIVATE) 번들을 404로 빼 늘 false. 멤버용 상세가 생기면 그 응답으로
    memberOnly: detail.visibility === 'PRIVATE',
    canEdit: detail.permissions.canEdit,
    canDelete: detail.permissions.canDelete,
    canReport: detail.permissions.canReport,
    // 서버 `comments`는 참여 멤버의 코멘트(소셜 댓글은 API 연동 4번)
    memberComments: detail.comments.map((comment) =>
      comment.profileAvailable
        ? {
            id: toDomainId(comment.id),
            name: comment.nickname ?? '',
            imageSrc: avatarOf(comment),
            comment: comment.content ?? '',
          }
        : { id: toDomainId(comment.id), name: '', comment: '', left: true },
    ),
    // ponytail: 소셜 댓글 목록은 댓글 API 연결(API 연동 4번) 전이라 비어 있고 화면에서만 더함
    comments: [],
  };
};

import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/client/ids';
import { isSafeImageUrl } from '@/shared/lib/image/safeImageUrl';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import type { KokPlace, PlaceMember, PlaceSource } from '../lib/types';

const wireId = z.number().int().positive();

const kokCardSchema = z.object({
  id: wireId,
  provider: z.string(),
  externalId: z.string(),
  name: z.string(),
  address: z.string().nullish(),
  pinnedByMemberId: wireId.nullish(),
  pinnedAt: z.string(),
  sourceType: z.enum(['BUNDLE', 'ADVERTISEMENT']),
  sourceAccessible: z.boolean(),
  sourceBundleId: wireId.nullish(),
  sourceBunchId: wireId.nullish(),
  sourceBunchName: z.string().nullish(),
  sourceBundleTitle: z.string().nullish(),
});

const kokMemberSchema = z.object({
  membershipId: wireId,
  memberId: wireId,
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  count: z.number().int().nonnegative(),
});

/** `GET /pinned-places` 응답(명세 005). 서버가 고른 지금 번치의 콕을 최근 콕한 순으로 */
export const pinnedPlacesResponseSchema = z.object({
  bunchId: wireId,
  selectedMemberId: wireId.nullish(),
  totalCount: z.number().int().nonnegative(),
  members: z.array(kokMemberSchema),
  items: z.array(kokCardSchema),
  nextCursor: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['KoksResponse']>>;

type PinnedPlacesResponse = z.infer<typeof pinnedPlacesResponseSchema>;
type KokCard = PinnedPlacesResponse['items'][number];

/** 콕한 장소 화면이 쓰는 모양: 칩(멤버·개수)과 카드 */
export type PinnedPlaces = {
  /** 서버가 고른 번치(이어 받은 쪽이 같은 번치인지 확인용) */
  bunchId: string;
  /** 서버가 거른 멤버. 고른 멤버가 지금 멤버가 아니면 서버가 「전체」로 돌려 없음(명세 005) */
  selectedMemberId: string | undefined;
  /** 번치 전체 콕 수(「전체」 칩, 고른 멤버와 무관) */
  totalCount: number;
  members: readonly (PlaceMember & { count: number })[];
  places: readonly KokPlace[];
  /** 다음 쪽을 받을 커서. 마지막 쪽이면 없음 */
  nextCursor: string | undefined;
};

// 광고 출처는 이동하지 않고, 원래 번들을 볼 수 없으면 출처 값이 비어 옴(명세 005 처리 규칙)
const sourceOf = (card: KokCard): PlaceSource => {
  if (card.sourceType === 'ADVERTISEMENT') return { kind: 'pick' };
  if (
    !card.sourceAccessible ||
    !card.sourceBunchName ||
    !card.sourceBundleTitle ||
    !card.sourceBunchId ||
    !card.sourceBundleId
  ) {
    return { kind: 'unavailable' };
  }
  return {
    kind: 'bundle',
    bunchId: toDomainId(card.sourceBunchId),
    bundleId: toDomainId(card.sourceBundleId),
    bunchName: card.sourceBunchName,
    bundleTitle: card.sourceBundleTitle,
  };
};

export const toPinnedPlaces = (data: PinnedPlacesResponse): PinnedPlaces => ({
  bunchId: toDomainId(data.bunchId),
  selectedMemberId: data.selectedMemberId ? toDomainId(data.selectedMemberId) : undefined,
  totalCount: data.totalCount,
  // 닉네임이 없는 멤버는 칩을 그릴 수 없어 뺌. 그 멤버의 콕은 「전체」에만 남음
  members: data.members.flatMap((member) =>
    member.nickname
      ? [
          {
            id: toDomainId(member.memberId),
            name: member.nickname,
            // 사진이 없거나 안전하지 않은 주소면 기본 프로필 이미지(비우면 배경색 원만 그림)
            avatarSrc:
              member.imageUrl && isSafeImageUrl(member.imageUrl)
                ? member.imageUrl
                : DEFAULT_PROFILE_IMAGE,
            count: member.count,
          },
        ]
      : [],
  ),
  places: data.items.map((card) => ({
    id: toDomainId(card.id),
    name: card.name,
    address: card.address ?? undefined,
    pickedBy: card.pinnedByMemberId ? toDomainId(card.pinnedByMemberId) : null,
    source: sourceOf(card),
  })),
  // 빈 문자열은 다음 쪽이 없는 것으로 봄(그대로 두면 커서 없이 첫 쪽을 다시 받아 끝없이 이어 받음)
  nextCursor: data.nextCursor || undefined,
});

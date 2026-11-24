import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import type { BunchMember as SharedBunchMember } from '@/shared/api/bunchMembers';
import type { MembershipsResponse, membershipRoleSchema } from '@/shared/api/bunchMemberships';
import { toDomainId } from '@/shared/api/ids';
import { BUNCH_ROLE_FROM_SERVER } from '@/shared/lib/bunchRole';
import { isSafeImageUrl } from '@/shared/lib/image/safeImageUrl';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import type { BunchMember, BunchRole } from '../lib/types';

type ServerRole = z.infer<typeof membershipRoleSchema>;
/** 화면 역할 → 서버 역할(역할 변경 요청) */
export const SERVER_ROLE: Readonly<Record<BunchRole, ServerRole>> = {
  owner: 'OWNER',
  coOwner: 'CO_OWNER',
  member: 'MEMBER',
};

const UNKNOWN_MEMBER_NAME = '알 수 없는 멤버';

/** 멤버 관리 화면이 쓰는 모양: 멤버(id는 소속 ID), 내 역할·소속 ID, 다음 요청의 `expectedMembershipVersion` */
export type ManagedMemberships = {
  members: BunchMember[];
  myRole: BunchRole;
  myMembershipId: string;
  version: number;
};

export const toManagedMemberships = (data: MembershipsResponse): ManagedMemberships => ({
  members: data.members.map((member) => ({
    id: toDomainId(member.membershipId),
    // 닉네임이 없으면(탈퇴 직후 등) 확인 창 문구가 비지 않게 대체 이름
    name: member.nickname || UNKNOWN_MEMBER_NAME,
    imageSrc:
      member.imageUrl && isSafeImageUrl(member.imageUrl) ? member.imageUrl : DEFAULT_PROFILE_IMAGE,
    role: BUNCH_ROLE_FROM_SERVER[member.role],
    isMe: member.isMe,
    actions: member.actions,
  })),
  myRole: BUNCH_ROLE_FROM_SERVER[data.myMembership.role],
  myMembershipId: toDomainId(data.myMembership.membershipId),
  version: data.membershipVersion,
});

/** 공용 멤버 목록(`GET /bunches/{bunchId}/members`) → 확인용 멤버 목록(관리 동작 없음). id는 회원 ID */
export const toBunchMembers = (members: readonly SharedBunchMember[]): BunchMember[] =>
  members.map((member) => ({
    id: member.id,
    name: member.name,
    imageSrc: isSafeImageUrl(member.avatarSrc) ? member.avatarSrc : DEFAULT_PROFILE_IMAGE,
    role: BUNCH_ROLE_FROM_SERVER[member.role],
  }));

/** 나가기·삭제 응답. 다음 기본 번치는 `members/me`를 다시 받아 확인해 값은 검증만 함 */
export const departureResultSchema = z.object({
  bunchId: z.number(),
  departedMembershipId: z.number(),
  outcome: z.string(),
  defaultBunchId: z.number().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchDepartureResponse']>>;

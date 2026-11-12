import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { BunchMember, BunchRole } from '../lib/types';

const roleSchema = z.enum(['OWNER', 'CO_OWNER', 'MEMBER']);
const ROLE: Readonly<Record<z.infer<typeof roleSchema>, BunchRole>> = {
  OWNER: 'owner',
  CO_OWNER: 'coOwner',
  MEMBER: 'member',
};
/** 화면 역할 → 서버 역할(역할 변경 요청) */
export const SERVER_ROLE: Readonly<Record<BunchRole, z.infer<typeof roleSchema>>> = {
  owner: 'OWNER',
  coOwner: 'CO_OWNER',
  member: 'MEMBER',
};

const UNKNOWN_MEMBER_NAME = '알 수 없는 멤버';

/** `GET /bunches/{bunchId}/memberships` 응답 */
export const membershipsResponseSchema = z.object({
  membershipVersion: z.number().int().nonnegative(),
  myMembership: z.object({ membershipId: z.number().int().positive(), role: roleSchema }),
  members: z.array(
    z.object({
      membershipId: z.number().int().positive(),
      nickname: z.string().nullish(),
      imageUrl: z.string().nullish(),
      role: roleSchema,
      isMe: z.boolean(),
      actions: z.object({
        canGrantCoOwner: z.boolean(),
        canRevokeCoOwner: z.boolean(),
        canTransferOwner: z.boolean(),
        canRemove: z.boolean(),
      }),
    }),
  ),
});
export type MembershipsResponse = z.infer<typeof membershipsResponseSchema>;

/** 역할 변경·넘기기·내보내기 응답(값은 쓰지 않아 새 버전 숫자만 확인) */
export const membershipChangeResultSchema = z.object({ membershipVersion: z.number() });

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
    role: ROLE[member.role],
    isMe: member.isMe,
    actions: member.actions,
  })),
  myRole: ROLE[data.myMembership.role],
  myMembershipId: toDomainId(data.myMembership.membershipId),
  version: data.membershipVersion,
});

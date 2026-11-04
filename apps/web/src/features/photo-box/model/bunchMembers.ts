import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import type { PhotoBoxMember } from '../lib/types';

/**
 * `GET /api/v1/bunches/{id}/members` 응답의 멤버 한 명. `satisfies`로 Swagger 생성 계약과 묶어 어긋나면 컴파일 오류
 * 이름은 계약상 선택이지만 사진함에 필수라 빠지면 계약 위반, 역할은 닫힌 목록, 사진은 생략·null 모두 허용
 */
const bunchMemberResponseSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string(),
  imageUrl: z.string().nullish(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchMemberResponse']>>;

export const bunchMembersResponseSchema = z.array(bunchMemberResponseSchema);

/** 사진함이 쓰는 멤버 모양으로 변환(문자열 id, 사진 없으면 기본 이미지, 역할은 관리자 판단용으로 유지) */
export const toPhotoBoxMember = (
  member: z.infer<typeof bunchMemberResponseSchema>,
): PhotoBoxMember => ({
  id: toDomainId(member.memberId),
  name: member.nickname,
  // 사진이 없거나 빈 문자열이면 기본 이미지(깨진 이미지 방지)
  avatarSrc: member.imageUrl || DEFAULT_BUNCH_IMAGE,
  role: member.role,
});

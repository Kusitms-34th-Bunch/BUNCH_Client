import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import type { PhotoBoxMember } from '../lib/types';

/**
 * `GET /api/v1/bunches/{bunchId}/members` 응답의 멤버 한 명(노션 API 명세 기준, 역할은 닫힌 목록이라 새 값은 계약 위반)
 * Swagger에 올라오면 `satisfies z.ZodType<생성 타입>`으로 생성 계약과 묶음
 */
const bunchMemberResponseSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string(),
  imageUrl: z.string().nullable(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']),
});

export const bunchMembersResponseSchema = z.array(bunchMemberResponseSchema);

/** 사진함이 쓰는 멤버 모양으로 변환(문자열 id, 사진 없으면 undefined). 역할은 사진함이 쓰지 않아 버림 */
export const toPhotoBoxMember = (
  member: z.infer<typeof bunchMemberResponseSchema>,
): PhotoBoxMember => ({
  id: toDomainId(member.memberId),
  name: member.nickname,
  // 빈 문자열도 사진 없음으로(깨진 이미지 방지)
  avatarSrc: member.imageUrl || undefined,
});

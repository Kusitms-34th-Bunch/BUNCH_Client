import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { bffApi, requestData } from './bffApi';
import { toDomainId } from './ids';

export type BunchMemberRole = 'OWNER' | 'CO_OWNER' | 'MEMBER';

/** 화면이 쓰는 번치 멤버 모양(문자열 id, 사진이 없으면 기본 이미지) */
export type BunchMember = {
  id: string;
  name: string;
  avatarSrc: string;
  role: BunchMemberRole;
};

/**
 * `GET /api/v1/bunches/{id}/members` 응답의 멤버 한 명. `satisfies`로 Swagger 생성 계약과 묶어 어긋나면 컴파일 오류
 * 이름은 계약상 선택이지만 화면에 필수라 빠지면 계약 위반, 역할은 닫힌 목록, 사진은 생략·null 모두 허용
 */
const bunchMemberResponseSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string(),
  imageUrl: z.string().nullish(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchMemberResponse']>>;

const bunchMembersResponseSchema = z.array(bunchMemberResponseSchema);

const toBunchMember = (member: z.infer<typeof bunchMemberResponseSchema>): BunchMember => ({
  id: toDomainId(member.memberId),
  name: member.nickname,
  // 사진이 없거나 빈 문자열이면 기본 프로필 이미지(깨진 이미지 방지)
  avatarSrc: member.imageUrl || DEFAULT_PROFILE_IMAGE,
  role: member.role,
});

/**
 * 번치의 활성 멤버 목록. 다른 번치는 공개거나 팔로우 승인 뒤만(아니면 AUTH_002), 없거나 차단한 번치는 BUNCH_009
 * signal은 Query가 넘겨 화면 이탈·key 변경 시 요청 취소
 * 사진이 없는 멤버는 기본 프로필 이미지로 채움
 */
export const getBunchMembers = async (bunchId: string, signal?: AbortSignal) => {
  const members = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(bunchId)}/members`, { signal: signal ?? null }),
    bunchMembersResponseSchema,
    'bunch members',
  );
  return members.map(toBunchMember);
};

import { z } from 'zod';
import { bffApi, requestData } from './client/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from './client/idempotencyKey';
import { toWireId } from './client/ids';

// 멤버 관리 목록·메인 관리자 넘기기. 번치 홈 멤버 관리와 MY 탈퇴 전 권한 넘기기가 함께 씀

export const membershipRoleSchema = z.enum(['OWNER', 'CO_OWNER', 'MEMBER']);

/** `GET /bunches/{bunchId}/memberships` 응답 */
// 계약 미연결: 멤버 관리에 필요한 필드만 받음(bunchId·joinedAt 등 생략)
export const membershipsResponseSchema = z.object({
  membershipVersion: z.number().int().nonnegative(),
  myMembership: z.object({ membershipId: z.number().int().positive(), role: membershipRoleSchema }),
  members: z.array(
    z.object({
      membershipId: z.number().int().positive(),
      nickname: z.string().nullish(),
      imageUrl: z.string().nullish(),
      role: membershipRoleSchema,
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
// 계약 미연결: 다음 요청에 쓰는 새 버전만 받음(바뀐 소속 목록 등 생략)
export const membershipChangeResultSchema = z.object({ membershipVersion: z.number() });

/** 바꾸는 요청 공통: 요청한 사람의 소속 ID와 목록을 받을 때의 버전(그 사이 바뀌었으면 서버가 거절) */
export type MembershipChangeBase = { actorMembershipId: string; expectedMembershipVersion: number };

export const membershipsPath = (bunchId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/memberships`;

export const toMembershipWireId = (id: string) => {
  const value = toWireId(id);
  if (value === undefined) throw new Error('소속 ID가 올바르지 않습니다.');
  return value;
};

export const membershipBaseBody = ({
  actorMembershipId,
  expectedMembershipVersion,
}: MembershipChangeBase) => ({
  actorMembershipId: toMembershipWireId(actorMembershipId),
  expectedMembershipVersion,
});

/** 멤버 관리 목록(멤버별 역할·내가 할 수 있는 관리 동작) */
export const getMemberships = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(membershipsPath(bunchId), { signal: signal ?? null }),
    membershipsResponseSchema,
    'bunch memberships',
  );

/** 메인 관리자 넘기기(나는 일반 멤버가 됨). 재전송이 두 번 넘기지 않게 멱등 키 필수 */
export const transferOwner = (
  bunchId: string,
  targetMembershipId: string,
  base: MembershipChangeBase,
  idempotencyKey: string,
) =>
  requestData(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/owner-transfer`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        ...membershipBaseBody(base),
        targetMembershipId: toMembershipWireId(targetMembershipId),
      },
    }),
    membershipChangeResultSchema,
    'transfer owner',
  );

import { bffApi, requestData } from '@/shared/api/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { BunchRole } from '../lib/types';
import {
  departureResultSchema,
  membershipChangeResultSchema,
  membershipsResponseSchema,
  SERVER_ROLE,
} from '../model/memberships';

const membershipsPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}/memberships`;

/** 바꾸는 요청 공통: 요청한 사람의 소속 ID와 목록을 받을 때의 버전(그 사이 바뀌었으면 서버가 거절) */
export type MembershipChangeBase = { actorMembershipId: string; expectedMembershipVersion: number };

const wire = (id: string) => {
  const value = toWireId(id);
  if (value === undefined) throw new Error('소속 ID가 올바르지 않습니다.');
  return value;
};
const baseBody = ({ actorMembershipId, expectedMembershipVersion }: MembershipChangeBase) => ({
  actorMembershipId: wire(actorMembershipId),
  expectedMembershipVersion,
});

/** 멤버 관리 목록(멤버별 역할·내가 할 수 있는 관리 동작) */
export const getMemberships = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(membershipsPath(bunchId), { signal: signal ?? null }),
    membershipsResponseSchema,
    'bunch memberships',
  );

/** 공동 관리자 지정(coOwner)·해제(member) */
export const changeMembershipRole = (
  bunchId: string,
  membershipId: string,
  role: Exclude<BunchRole, 'owner'>,
  base: MembershipChangeBase,
) =>
  requestData(
    bffApi.put(`${membershipsPath(bunchId)}/${encodeURIComponent(membershipId)}/role`, {
      json: { ...baseBody(base), role: SERVER_ROLE[role] },
    }),
    membershipChangeResultSchema,
    'change membership role',
  );

/** 번치에서 내보내기 */
export const removeMembership = (
  bunchId: string,
  membershipId: string,
  base: MembershipChangeBase,
) =>
  requestData(
    bffApi.post(`${membershipsPath(bunchId)}/${encodeURIComponent(membershipId)}/remove`, {
      json: baseBody(base),
    }),
    membershipChangeResultSchema,
    'remove membership',
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
      json: { ...baseBody(base), targetMembershipId: wire(targetMembershipId) },
    }),
    membershipChangeResultSchema,
    'transfer owner',
  );

/** 번치 나가기. 메인 관리자는 새 관리자(`successorMembershipId`)를 함께 보내 넘기기와 나가기를 한 번에 함 */
export const leaveBunch = (
  bunchId: string,
  base: MembershipChangeBase,
  successorMembershipId: string | undefined,
  idempotencyKey: string,
) =>
  requestData(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/leave`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        ...baseBody(base),
        ...(successorMembershipId === undefined
          ? {}
          : { successorMembershipId: wire(successorMembershipId) }),
      },
    }),
    departureResultSchema,
    'leave bunch',
  );

/** 번치 삭제(메인 관리자). `confirmation`은 화면이 입력과 맞는지 확인한 확인 문구 */
export const deleteBunch = (
  bunchId: string,
  base: MembershipChangeBase,
  confirmation: string,
  idempotencyKey: string,
) =>
  requestData(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/deletion`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: { ...baseBody(base), confirmation },
    }),
    departureResultSchema,
    'delete bunch',
  );

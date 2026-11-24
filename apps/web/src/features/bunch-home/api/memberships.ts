import {
  type MembershipChangeBase,
  membershipBaseBody as baseBody,
  membershipChangeResultSchema,
  membershipsPath,
  toMembershipWireId as wire,
} from '@/shared/api/bunchMemberships';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/client/idempotencyKey';
import type { BunchRole } from '../lib/types';
import { departureResultSchema, SERVER_ROLE } from '../model/memberships';

// 목록 조회·메인 관리자 넘기기는 MY 탈퇴도 써서 shared에 둠
export {
  getMemberships,
  type MembershipChangeBase,
  transferOwner,
} from '@/shared/api/bunchMemberships';

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

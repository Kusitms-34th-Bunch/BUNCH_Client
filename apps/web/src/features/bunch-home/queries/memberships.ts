import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { sharedKeys } from '@/shared/query/keys';
import type { BunchRole } from '../lib/types';
import {
  changeMembershipRole,
  getMemberships,
  type MembershipChangeBase,
  removeMembership,
  transferOwner,
} from '../api/memberships';

/** 멤버 관리 목록. 번치를 모르면 요청하지 않음. 관리 동작은 버전으로 막으므로 들어올 때마다 새로 받음 */
export const membershipsQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchMemberships(bunchId),
    queryFn: bunchId ? ({ signal }) => getMemberships(bunchId, signal) : skipToken,
    staleTime: 0,
  });

export type MembershipChange =
  | { kind: 'role'; membershipId: string; role: Exclude<BunchRole, 'owner'> }
  | { kind: 'remove'; membershipId: string }
  | { kind: 'transfer'; membershipId: string };

/**
 * 역할 지정·해제, 내보내기, 메인 관리자 넘기기
 * 성공하면 번치 홈 전체(개수·내 역할·권한·멤버 관리 목록), 멤버 목록(번치 홈·사진함·번들), 전환 목록을 다시 받은 뒤 끝냄
 */
export const useChangeMembershipMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ change, base }: { change: MembershipChange; base: MembershipChangeBase }) => {
      if (bunchId === undefined) throw new Error('번치를 아직 모릅니다.');
      switch (change.kind) {
        case 'role':
          return changeMembershipRole(bunchId, change.membershipId, change.role, base);
        case 'remove':
          return removeMembership(bunchId, change.membershipId, base);
        case 'transfer':
          return transferOwner(bunchId, change.membershipId, base, createIdempotencyKey());
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope(bunchId) }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.bunchMembers(bunchId) }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
      ]),
  });
};

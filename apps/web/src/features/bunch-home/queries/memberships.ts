import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { sharedKeys } from '@/shared/query/keys';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { BunchRole } from '../lib/types';
import {
  changeMembershipRole,
  deleteBunch,
  getMemberships,
  leaveBunch,
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

export type Departure =
  | { kind: 'leave'; successorMembershipId?: string | undefined }
  | { kind: 'delete'; confirmation: string };

/**
 * 번치 나가기·삭제. 기본 번치가 바뀌므로 `members/me`를 다시 받은 뒤 끝냄(이동한 번치 탭이 새 기본 번치나 번치 없음을 바로 그림)
 * 떠난 번치의 캐시는 화면이 빠진 뒤 호출하는 쪽이 지움(빠지는 동안 그 번치를 그대로 그림)
 */
export const useDepartBunchMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      departure,
      base,
      idempotencyKey,
    }: {
      departure: Departure;
      base: MembershipChangeBase;
      idempotencyKey: string;
    }) => {
      if (bunchId === undefined) throw new Error('번치를 아직 모릅니다.');
      await (departure.kind === 'leave'
        ? leaveBunch(bunchId, base, departure.successorMembershipId, idempotencyKey)
        : deleteBunch(bunchId, base, departure.confirmation, idempotencyKey));
      // 요청 전에 시작한 members/me 응답(떠난 번치)을 다시 쓰지 않게 멈춤
      await queryClient.cancelQueries({ queryKey: sharedKeys.me() });
      // 다시 받기가 실패해도 처리는 끝났으므로 성공으로 봄. 떠난 번치를 가리키는 값은 지워 이동한 화면이 새로 받게 함
      await queryClient
        .fetchQuery({ ...myProfileQueryOptions(), staleTime: 0 })
        .catch(() => queryClient.removeQueries({ queryKey: sharedKeys.me() }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
  });
};

/** 떠난 번치의 캐시(기기에 저장된 홈·멤버 포함)를 지우는 함수. 다시 들어와도 옛 값이 먼저 보이지 않게 */
export const useForgetBunchCache = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (bunchId: string) => {
      queryClient.removeQueries({ queryKey: sharedKeys.bunchHomeScope(bunchId) });
      queryClient.removeQueries({ queryKey: sharedKeys.bunchMembers(bunchId) });
    },
    [queryClient],
  );
};

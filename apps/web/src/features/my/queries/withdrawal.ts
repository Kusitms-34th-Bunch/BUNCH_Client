import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMemberships, transferOwner } from '@/shared/api/bunchMemberships';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { toDomainId } from '@/shared/api/ids';
import { isSafeImageUrl } from '@/shared/lib/image/safeImageUrl';
import { DEFAULT_PROFILE_IMAGE, defaultBunchImage } from '@/shared/lib/profile/bunchProfile';
import { sharedKeys } from '@/shared/query/keys';
import { myBunchesQueryOptions } from '@/shared/query/myBunches';
import { clearPersistedQueryStorage } from '@/shared/query/persistence';
import type { OwnedBunch } from '../lib/types';
import { getWithdrawalCheck, withdraw } from '../api/withdrawal';
import { MY_MESSAGES } from '../constants/messages';
import { MY_PATHS } from '../constants/paths';
import { authorizeApple } from '../lib/appleAuthorization';
import { reloadTo } from '../lib/navigation';
import { myKeys } from './keys';

const safeImage = (url: string | null | undefined) =>
  url && isSafeImageUrl(url) ? url : undefined;

/**
 * 탈퇴 전 넘겨야 할 번치: 메인 관리자 번치마다 멤버 목록을 받아 넘길 멤버(나 제외)를 붙이고, 나 혼자인 번치는 뺌(7.6.3 로직 4)
 * 소속 ID·버전은 방금 받은 멤버 목록 값(서버가 버전을 검사하는 목록과 같은 출처)
 */
export const ownedBunchesQueryOptions = () =>
  queryOptions({
    queryKey: myKeys.ownedBunches(),
    queryFn: async ({ signal }): Promise<OwnedBunch[]> => {
      const { ownerBunches: owned } = await getWithdrawalCheck(signal);
      const bunches = await Promise.all(
        owned.map(async (bunch): Promise<OwnedBunch> => {
          const memberships = await getMemberships(bunch.id, signal);
          return {
            ...bunch,
            myMembershipId: toDomainId(memberships.myMembership.membershipId),
            membershipVersion: memberships.membershipVersion,
            candidates: memberships.members
              .filter((member) => !member.isMe && member.actions.canTransferOwner)
              .map((member) => ({
                id: toDomainId(member.membershipId),
                // 닉네임이 없으면(탈퇴 직후 등) 선택지 이름이 비지 않게 대체 이름
                name: member.nickname || MY_MESSAGES.transfer.unknownMember,
                // 사진이 없으면 기본 프로필 이미지(비우면 배경색 원만 그림)
                imageSrc: safeImage(member.imageUrl) ?? DEFAULT_PROFILE_IMAGE,
                role: member.role === 'CO_OWNER' ? 'coOwner' : 'member',
              })),
          };
        }),
      );
      return bunches.filter((bunch) => bunch.candidates.length > 0);
    },
    staleTime: 0,
  });

/**
 * 넘길 번치의 표시 이미지: 대표 사진(탈퇴 확인 응답) → 소속 번치 목록의 대표 사진 → 그 번치 타입의 기본 이미지 → 타입 1
 * 탈퇴 확인 응답에 타입이 없어 소속 번치 목록(번치 홈과 같은 캐시)에서 찾음. 탈퇴 확인·멤버 조회가 이 목록을 기다리지 않도록 따로 읽고,
 * 받기 전·실패하면 받아 둔(복원한) 목록이나 타입 1로 먼저 보이고 받으면 이미지만 바뀜
 */
export const useOwnedBunchImage = () => {
  const { data } = useQuery({ ...myBunchesQueryOptions(), retry: false });
  const byId = useMemo(
    () => new Map(data?.activeBunches.map(({ bunch }) => [toDomainId(bunch.id), bunch])),
    [data],
  );
  return (bunch: OwnedBunch) => {
    const profile = byId.get(bunch.id);
    return (
      bunch.imageSrc ?? safeImage(profile?.imageUrl) ?? defaultBunchImage(profile?.characterType)
    );
  };
};

/** 넘겨야 할 번치를 지금 서버 값으로 새로 받는 함수(탈퇴 안내의 「다음」·「탈퇴하기」 직전 확인) */
export const useFetchOwnedBunches = () => {
  const queryClient = useQueryClient();
  return () => queryClient.fetchQuery(ownedBunchesQueryOptions());
};

/**
 * 탈퇴 전 관리자 권한 넘기기(번치 ID → 새 메인 관리자 소속 ID). 번치마다 따로 요청하고 하나라도 실패하면 실패로 끝냄
 * 성공·실패와 관계없이 넘길 번치 목록과 넘긴 번치의 번치 홈·멤버 목록·전환 목록을 다시 받음(일부만 넘어간 경우 남은 번치만 다시 고름)
 */
export const useTransferOwnershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bunches,
      selections,
    }: {
      bunches: readonly OwnedBunch[];
      selections: Readonly<Record<string, string>>;
    }) => {
      // 하나라도 고르지 않았으면 아무것도 보내지 않음(화면은 모두 고른 뒤에만 「다음」을 엶)
      if (bunches.some((bunch) => selections[bunch.id] === undefined)) {
        throw new Error('새 관리자를 고르지 않은 번치가 있습니다.');
      }
      const results = await Promise.allSettled(
        bunches.map((bunch) =>
          transferOwner(
            bunch.id,
            selections[bunch.id] as string,
            {
              actorMembershipId: bunch.myMembershipId,
              expectedMembershipVersion: bunch.membershipVersion,
            },
            createIdempotencyKey(),
          ),
        ),
      );
      // 넘긴 번치를 먼저 뺌(다시 받기가 실패해도 이미 넘긴 번치를 다시 고르지 않게)
      const moved = new Set(
        bunches.filter((_bunch, index) => results[index]?.status === 'fulfilled').map((b) => b.id),
      );
      queryClient.setQueryData(myKeys.ownedBunches(), (previous: OwnedBunch[] | undefined) =>
        previous?.filter((bunch) => !moved.has(bunch.id)),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myKeys.ownedBunches() }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
        ...bunches.flatMap((bunch) => [
          queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope(bunch.id) }),
          queryClient.invalidateQueries({ queryKey: sharedKeys.bunchMembers(bunch.id) }),
        ]),
      ]);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed) throw failed.reason;
    },
    meta: { errorMessage: MY_MESSAGES.withdrawal.failed },
  });
};

/**
 * 회원 탈퇴. 실패 토스트는 공통 처리(meta.errorMessage)
 * Apple 가입자는 직전에 Apple 재인증을 받아 그 코드로 탈퇴(코드는 일회용이라 다시 누르면 새로 받음). 창을 닫으면 `cancelled`로 끝냄
 * 성공하면 이 기기의 저장본을 지우고 로그인 화면을 새로 엶(메모리의 사용자 데이터까지 비움). 요청 중 화면이 사라져도 실행되도록 여기서 처리
 */
export const useWithdrawMutation = () =>
  useMutation({
    mutationFn: async (): Promise<'withdrawn' | 'cancelled'> => {
      const { provider } = await getWithdrawalCheck();
      let appleAuthorizationCode: string | undefined;
      if (provider === 'APPLE') {
        const result = await authorizeApple();
        if (result.status === 'cancelled') return 'cancelled';
        appleAuthorizationCode = result.authorizationCode;
      }
      await withdraw(appleAuthorizationCode);
      return 'withdrawn';
    },
    meta: { errorMessage: MY_MESSAGES.withdrawal.failed },
    onSuccess: (result) => {
      if (result === 'cancelled') return;
      clearPersistedQueryStorage();
      reloadTo(MY_PATHS.login);
    },
  });

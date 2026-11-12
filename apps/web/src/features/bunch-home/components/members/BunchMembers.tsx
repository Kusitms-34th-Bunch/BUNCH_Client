'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { type BunchMemberActions, sortMembers } from '../../hooks/useBunchMembers';
import { toManagedMemberships } from '../../model/memberships';
import { bunchHomeQueryOptions } from '../../queries/bunchHome';
import {
  type MembershipChange,
  membershipsQueryOptions,
  useChangeMembershipMutation,
} from '../../queries/memberships';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchMembersScreen } from './BunchMembersScreen';

/**
 * `/bunch/members` 멤버 관리: 내 기본 번치(`members/me`)의 멤버 관리 목록(`GET /bunches/{id}/memberships`)
 * 관리 메뉴는 서버가 멤버마다 준 동작만 보이고, 처리는 목록을 받을 때의 버전으로 보내 그 사이 바뀌었으면 서버가 거절
 */
export function BunchMembers() {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const memberships = useQuery(membershipsQueryOptions(bunchId));
  const change = useChangeMembershipMutation(bunchId);
  // 실패 뒤 목록을 다시 받는 동안도 처리 중(오래된 버전으로 다시 보내지 않게)
  const [recovering, setRecovering] = useState(false);
  // 실패 뒤 다시 받기도 실패하면 목록·버전이 오래돼 관리하지 않고 다시 받기를 권함
  const [refreshFailed, setRefreshFailed] = useState(false);
  const managed = useMemo(
    () => (memberships.data ? toManagedMemberships(memberships.data) : undefined),
    [memberships.data],
  );
  const members = useMemo(() => managed && sortMembers(managed.members), [managed]);
  // 번치가 없으면(모두 나감) 번치 탭으로
  const hasNoBunch = me.isSuccess && bunchId === undefined;
  useEffect(() => {
    if (hasNoBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [hasNoBunch, router]);

  // 받은 값이 하나도 없을 때만 오류 화면(다시 받기만 실패하면 목록을 지우지 않음)
  if ((me.isError && !me.data) || (memberships.isError && !memberships.data) || refreshFailed) {
    return (
      <BunchHomeError
        onRetry={() => {
          if (me.isError) void me.refetch();
          if (memberships.isError || refreshFailed) {
            void memberships.refetch().then(({ isError }) => {
              if (isError) return;
              setRefreshFailed(false);
              setRecovering(false);
            });
          }
        }}
      />
    );
  }
  if (!managed) {
    return (
      <>
        <p role="status" className="sr-only">
          멤버를 불러오는 중이에요
        </p>
        <PageLoading />
      </>
    );
  }

  const run = (target: MembershipChange) =>
    change.mutateAsync(
      {
        change: target,
        base: {
          actorMembershipId: managed.myMembershipId,
          expectedMembershipVersion: managed.version,
        },
      },
      {
        onError: () => {
          setRecovering(true);
          // 충돌 코드가 Swagger에 없어, 다시 받은 버전이 요청한 버전과 다르면 그 사이 바뀐 것으로 봄
          void memberships.refetch().then(({ data, isError }) => {
            // refetch는 실패해도 reject하지 않고 이전 값을 돌려주므로 오류 여부를 따로 봄
            if (isError) {
              setRefreshFailed(true);
              return;
            }
            setRecovering(false);
            toast(
              data && data.membershipVersion !== managed.version
                ? BUNCH_HOME_MESSAGES.membersChangedElsewhere
                : BUNCH_HOME_MESSAGES.memberChangeFailed,
            );
          });
        },
      },
    );
  const actions: BunchMemberActions = {
    setRole: (membershipId, role) => run({ kind: 'role', membershipId, role }),
    transferOwner: (membershipId) => run({ kind: 'transfer', membershipId }),
    remove: (membershipId) => run({ kind: 'remove', membershipId }),
  };

  return (
    <BunchMembersScreen
      bunchName={home.data?.bunch.name}
      members={members}
      myRole={managed.myRole}
      actions={actions}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
      onInvite={() => router.push(BUNCH_HOME_PATHS.invite)}
      busy={change.isPending || recovering}
    />
  );
}

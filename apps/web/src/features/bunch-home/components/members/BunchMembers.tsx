'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { type BunchMemberActions, sortMembers } from '../../lib/members';
import { type ManagedMemberships, toManagedMemberships } from '../../model/memberships';
import { bunchHomeQueryOptions, LIVE_REFRESH } from '../../queries/bunchHome';
import {
  type MembershipChange,
  membershipsQueryOptions,
  useChangeMembershipMutation,
} from '../../queries/memberships';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchMembersScreen } from './BunchMembersScreen';

/** 목록을 받기 전에는 누를 행이 없어 부르지 않는 동작 */
const LOADING_ACTIONS: BunchMemberActions = {
  setRole: () => Promise.resolve(),
  transferOwner: () => Promise.resolve(),
  remove: () => Promise.resolve(),
};
/**
 * 실패한 관리 작업 뒤 다시 받은 목록에서 역할이 바뀐 쪽: 내 역할이면 mine, 대상 멤버의 역할이면 target
 * 대상이 목록에서 사라진 경우(나감·내보내짐)는 역할 변경으로 보지 않음
 */
const findRoleChange = (
  before: ManagedMemberships,
  after: ManagedMemberships,
  change: MembershipChange,
): 'mine' | 'target' | undefined => {
  if (after.myRole !== before.myRole) return 'mine';
  const roleOf = (list: ManagedMemberships, id: string) =>
    list.members.find((member) => member.id === id)?.role;
  const next = roleOf(after, change.membershipId);
  return next !== undefined && next !== roleOf(before, change.membershipId) ? 'target' : undefined;
};

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
  // 머무는 동안 새로 가입한 멤버도 보이게 주기적으로 다시 받음
  const memberships = useQuery({ ...membershipsQueryOptions(bunchId), ...LIVE_REFRESH });
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
        onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
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
  // 받는 중은 실제 헤더와 멤버 행 스켈레톤(받는 중 안내는 화면의 상태 영역이 맡음). 목록이 없어 역할·동작은 쓰이지 않음
  if (!managed) {
    return (
      <BunchMembersScreen
        bunchName={home.data?.bunch.name}
        members={undefined}
        myRole={undefined}
        actions={LOADING_ACTIONS}
        onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
        onInvite={() => router.push(BUNCH_HOME_PATHS.invite)}
      />
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
            const roleChange = data && findRoleChange(managed, toManagedMemberships(data), target);
            if (roleChange) {
              // 내 역할이나 대상 멤버의 역할이 바뀌었으면 안내 뒤 이전 화면(더보기)으로, 기록이 없으면 더보기 메뉴로(기능명세 5.6.1 예외 처리)
              // 이동하며 알리는 안내라 도착 화면 기준으로 띄움(결정 기록 020)
              toastAfterNavigation(
                roleChange === 'mine'
                  ? BUNCH_HOME_MESSAGES.memberManagePermissionChanged
                  : BUNCH_HOME_MESSAGES.membersChangedElsewhere,
              );
              backOr(BUNCH_HOME_PATHS.menu);
              return;
            }
            // 역할 변경이 아닌 실패(그사이 멤버가 나감 등 버전만 바뀐 경우 포함)는 명세에 따로 없어 공통 실패 문구로 두고 최신 목록에 머묾
            // 5.6.1의 역할 변경 안내는 역할이 실제로 바뀐 경우에만 씀(사용자 확인)
            toast(BUNCH_HOME_MESSAGES.memberChangeFailed);
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

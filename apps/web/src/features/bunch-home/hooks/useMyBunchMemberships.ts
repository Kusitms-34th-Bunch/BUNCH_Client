import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { loadFailed } from '@/shared/query/loadFailed';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { PERMISSION_DENIED_CODE } from '../constants/roles';
import { toManagedMemberships } from '../model/memberships';
import { bunchHomeQueryOptions } from '../queries/bunchHome';
import {
  type Departure,
  membershipsQueryOptions,
  useDepartBunchMutation,
  useForgetBunchCache,
} from '../queries/memberships';

const departFailedMessage = (departure: Departure) =>
  departure.kind === 'leave' ? BUNCH_HOME_MESSAGES.leaveFailed : BUNCH_HOME_MESSAGES.deleteFailed;

/**
 * 더보기·나가기·삭제 화면의 지금 번치(`members/me` 기본 번치)와 멤버 관리 목록, 나가기·삭제
 * 처리 중에는 그 번치를 고정해, 기본 번치가 바뀌어도 화면이 빠질 때까지 떠난 번치를 그대로 그림
 */
export function useMyBunchMemberships() {
  const router = useRouter();
  const forgetBunchCache = useForgetBunchCache();
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const me = useQuery(myProfileQueryOptions());
  const bunchId = pinnedId ?? me.data?.bunch?.id;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const memberships = useQuery(membershipsQueryOptions(bunchId));
  const managed = memberships.data ? toManagedMemberships(memberships.data) : undefined;
  const mutation = useDepartBunchMutation(bunchId);
  // 확인 뒤 다시 제출(Enter 반복·연타)해도 한 번만 보냄. 성공하면 화면이 빠지므로 풀지 않음
  const departing = useRef(false);
  // 같은 요청(번치·본문)을 다시 보내면 같은 키: 처리됐는데 응답만 못 받았으면 서버가 처음 응답을 돌려줌
  const attempt = useRef<{ request: string; key: string } | null>(null);
  // 떠나는 번치의 캐시(저장된 홈·멤버 포함)는 화면이 빠질 때 지움. 요청 중 빠져도 지우게 보낼 때 기록
  // 요청 중 빠진 뒤 실패해도 지우지만 다음 진입 때 다시 받을 뿐
  const departingId = useRef<string | null>(null);
  // 화면이 내려갔는지(목록을 기다리는 사이 떠나면 나가기·삭제를 보내지 않음)
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      if (departingId.current !== null) forgetBunchCache(departingId.current);
    };
  }, [forgetBunchCache]);

  // 번치가 없으면(모두 나감) 번치 탭으로
  const hasNoBunch = pinnedId === null && me.isSuccess && !me.data.bunch;
  useEffect(() => {
    if (hasNoBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [hasNoBunch, router]);

  /**
   * 나가기·삭제를 목록을 받을 때의 버전으로 보냄. 성공하면 `onDone`(이동·토스트), 실패하면 안내 뒤 목록을 다시 받음
   * 미리 받은 목록으로 그린 뒤 다시 받는 중이면 그 응답을 기다림. 그사이 목록이 바뀌었거나 받지 못하면 보내지 않고 실패 안내
   * (보던 목록에서 고른 후임이 최신 목록에서 달라졌을 수 있어 새 목록으로 다시 고르게 함)
   */
  const depart = (departure: Departure, onDone: () => void) => {
    if (!managed || bunchId === undefined || departing.current) return;
    departing.current = true;
    if (!memberships.isFetching) {
      send(managed, bunchId, departure, onDone);
      return;
    }
    const seenVersion = managed.version;
    void memberships.refetch({ cancelRefetch: false }).then(({ data, isError }) => {
      // 기다리는 사이 화면을 떠났으면 사용자가 그만둔 것으로 보고 보내지 않음(보내지 않았으니 지울 캐시도 없음)
      if (unmounted.current) {
        departing.current = false;
        return;
      }
      const latest = data && !isError ? toManagedMemberships(data) : undefined;
      if (latest && latest.version === seenVersion) {
        send(latest, bunchId, departure, onDone);
        return;
      }
      departing.current = false;
      toast(departFailedMessage(departure));
    });
  };

  const send = (
    current: NonNullable<typeof managed>,
    bunchId: string,
    departure: Departure,
    onDone: () => void,
  ) => {
    departingId.current = bunchId;
    setPinnedId(bunchId);
    const base = {
      actorMembershipId: current.myMembershipId,
      expectedMembershipVersion: current.version,
    };
    const request = JSON.stringify([bunchId, departure, base]);
    if (attempt.current?.request !== request) {
      attempt.current = { request, key: createIdempotencyKey() };
    }
    mutation.mutate(
      { departure, base, idempotencyKey: attempt.current.key },
      {
        onSuccess: onDone,
        onError: (error) => {
          departing.current = false;
          departingId.current = null;
          setPinnedId(null);
          // 삭제하는 사이 메인 관리자가 아니게 됐으면 권한 변경 안내(기능명세 5.4.1 예외)
          // 다시 받은 역할이 바뀌었으면 삭제 화면이 더보기로 돌아가므로 도착 화면에 띄움(결정 기록 020)
          if (
            departure.kind === 'delete' &&
            isApiError(error) &&
            error.code === PERMISSION_DENIED_CODE
          ) {
            void memberships.refetch().then(({ data, isError }) => {
              const demoted = !isError && data && toManagedMemberships(data).myRole !== 'owner';
              if (demoted) toastAfterNavigation(BUNCH_HOME_MESSAGES.memberManagePermissionChanged);
              else toast(BUNCH_HOME_MESSAGES.memberManagePermissionChanged);
            });
            return;
          }
          toast(departFailedMessage(departure));
          // 그 사이 멤버·역할이 바뀌었으면 새 버전·역할로 다시 그림
          void memberships.refetch();
        },
      },
    );
  };

  return {
    /** 지금 번치(처리 중에는 떠나는 번치). 모르면 undefined */
    bunchId,
    // 홈을 못 받았으면 기본 번치 이름(처리 중에는 기본 번치가 바뀌므로 쓰지 않음)
    bunchName: home.data?.bunch.name ?? (pinnedId === null ? me.data?.bunch?.name : undefined),
    managed,
    /** 받은 값이 하나도 없을 때만 오류(다시 받기만 실패하면 그리던 화면 유지) */
    failed: loadFailed(me) || loadFailed(memberships),
    retry: () => {
      if (me.isError) void me.refetch();
      if (memberships.isError) void memberships.refetch();
    },
    depart,
  };
}

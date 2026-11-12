import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { toManagedMemberships } from '../model/memberships';
import { bunchHomeQueryOptions } from '../queries/bunchHome';
import {
  type Departure,
  membershipsQueryOptions,
  useDepartBunchMutation,
  useForgetBunchCache,
} from '../queries/memberships';

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
  const managed = useMemo(
    () => (memberships.data ? toManagedMemberships(memberships.data) : undefined),
    [memberships.data],
  );
  const mutation = useDepartBunchMutation(bunchId);
  // 확인 뒤 다시 제출(Enter 반복·연타)해도 한 번만 보냄. 성공하면 화면이 빠지므로 풀지 않음
  const departing = useRef(false);
  // 같은 요청(번치·본문)을 다시 보내면 같은 키: 처리됐는데 응답만 못 받았으면 서버가 처음 응답을 돌려줌
  const attempt = useRef<{ request: string; key: string } | null>(null);
  // 떠난 번치의 캐시(저장된 홈·멤버 포함)는 화면이 빠질 때 지움(빠지는 동안에는 그 번치를 그림)
  const departedId = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (departedId.current !== null) forgetBunchCache(departedId.current);
    },
    [forgetBunchCache],
  );

  // 번치가 없으면(모두 나감) 번치 탭으로
  const hasNoBunch = pinnedId === null && me.isSuccess && !me.data.bunch;
  useEffect(() => {
    if (hasNoBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [hasNoBunch, router]);

  /** 나가기·삭제를 목록을 받을 때의 버전으로 보냄. 성공하면 `onDone`(이동·토스트), 실패하면 안내 뒤 목록을 다시 받음 */
  const depart = (departure: Departure, onDone: () => void) => {
    if (!managed || bunchId === undefined || departing.current) return;
    departing.current = true;
    setPinnedId(bunchId);
    const base = {
      actorMembershipId: managed.myMembershipId,
      expectedMembershipVersion: managed.version,
    };
    const request = JSON.stringify([bunchId, departure, base]);
    if (attempt.current?.request !== request) {
      attempt.current = { request, key: createIdempotencyKey() };
    }
    mutation.mutate(
      { departure, base, idempotencyKey: attempt.current.key },
      {
        onSuccess: () => {
          departedId.current = bunchId;
          onDone();
        },
        onError: () => {
          departing.current = false;
          setPinnedId(null);
          toast(
            departure.kind === 'leave'
              ? BUNCH_HOME_MESSAGES.leaveFailed
              : BUNCH_HOME_MESSAGES.deleteFailed,
          );
          // 그 사이 멤버·역할이 바뀌었으면 새 버전·역할로 다시 그림
          void memberships.refetch();
        },
      },
    );
  };

  return {
    // 홈을 못 받았으면 기본 번치 이름(처리 중에는 기본 번치가 바뀌므로 쓰지 않음)
    bunchName: home.data?.bunch.name ?? (pinnedId === null ? me.data?.bunch?.name : undefined),
    managed,
    /** 받은 값이 하나도 없을 때만 오류(다시 받기만 실패하면 그리던 화면 유지) */
    failed: (me.isError && !me.data) || (memberships.isError && !memberships.data),
    retry: () => {
      if (me.isError) void me.refetch();
      if (memberships.isError) void memberships.refetch();
    },
    depart,
  };
}

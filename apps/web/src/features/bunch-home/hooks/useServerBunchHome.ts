'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { BunchHomeDetail, BunchSummary } from '../lib/types';
import { toBunchHomeDetail, toBunchSummaries } from '../model/bunchHome';
import {
  bunchHomeQueryOptions,
  draftBundlesQueryOptions,
  myBunchesQueryOptions,
  publishedBundlesQueryOptions,
} from '../queries/bunchHome';

export type ServerBunchHome =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  /** 소속 번치가 없음(번치 없음 화면) */
  | { kind: 'no-bunch' }
  | {
      kind: 'ready';
      current: BunchHomeDetail;
      /** 전환 목록(지금 번치가 맨 위). 목록을 못 받으면 지금 번치 하나 */
      bunches: readonly BunchSummary[];
      /** 소속 번치가 최대 개수라 더 참여할 수 없음(목록을 못 받으면 false, 서버가 만들 때 다시 막음) */
      atBunchLimit: boolean;
    };

type Options = {
  /** false면 요청하지 않음(샘플 데이터로 보는 테스트·미리보기) */
  enabled?: boolean;
};

/**
 * 번치 홈의 프로필·개수와 완성된 번들·작성 중인 번들을 서버(가짜 서버 포함)에서 받아 화면 모양으로 돌려줌
 * 내 기본 번치(`members/me`, 마지막 사용 번치)를 지금 번치로 보고, 전환 목록은 `members/me/bunches`
 * 팔로우·알림·멤버 관리는 아직 샘플이라 이 hook 밖에 있음
 */
export function useServerBunchHome({ enabled = true }: Options = {}): ServerBunchHome {
  const profile = useQuery({ ...myProfileQueryOptions(), enabled });
  const bunchId = enabled ? profile.data?.bunch?.id : undefined;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const published = useQuery(publishedBundlesQueryOptions(bunchId));
  const drafts = useQuery(draftBundlesQueryOptions(bunchId));
  const members = useQuery(bunchMembersQueryOptions(bunchId));
  const myBunches = useQuery({ ...myBunchesQueryOptions(), enabled });

  const ready = useMemo(() => {
    if (!home.data || !published.data || !drafts.data) return undefined;
    // 번치 멤버는 작성 중인 번들 카드의 얼굴에만 쓰여, 못 받아도 얼굴만 비우고 홈은 보임
    const current = toBunchHomeDetail(home.data, published.data, drafts.data, members.data ?? []);
    if (!current) return undefined;
    // 전환 목록은 홈을 막지 않음: 못 받으면 지금 번치 하나로 보임
    const bunches: readonly BunchSummary[] = myBunches.data
      ? toBunchSummaries(myBunches.data, current.id)
      : [
          {
            id: current.id,
            name: current.name,
            imageSrc: current.imageSrc,
            alertCount: home.data.unreadCount ?? 0,
            access: 'active',
          },
        ];
    const atBunchLimit = myBunches.data
      ? myBunches.data.activeCount >= myBunches.data.maxActiveCount
      : false;
    return { current, bunches, atBunchLimit };
  }, [home.data, published.data, drafts.data, members.data, myBunches.data]);

  if (profile.data && !profile.data.bunch) return { kind: 'no-bunch' };
  if (ready) return { kind: 'ready', ...ready };
  // 내 번치가 아닌 응답(소속 null)이라 변환하지 못한 경우도 처음부터 못 받은 오류로 봄
  const unusable = home.data && published.data && drafts.data && !ready;
  // 이미 받은 값이 있으면 재조회 실패로 화면을 덮지 않고, 처음부터 못 받았을 때만 오류
  if (unusable || profile.isError || home.isError || published.isError || drafts.isError) {
    return {
      kind: 'error',
      retry: () => {
        if (profile.isError) void profile.refetch();
        // 응답은 받았지만 쓸 수 없는 경우(isError 아님)에도 다시 받음
        if (home.isError || unusable) void home.refetch();
        if (published.isError || unusable) void published.refetch();
        if (drafts.isError || unusable) void drafts.refetch();
      },
    };
  }
  return { kind: 'loading' };
}

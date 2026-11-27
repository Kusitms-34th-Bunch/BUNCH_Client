'use client';

import { useInfiniteQuery, useIsMutating, useQuery } from '@tanstack/react-query';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myBunchesQueryOptions } from '@/shared/query/myBunches';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { BunchHomeDetail, BunchSummary } from '../lib/types';
import { itemsOfPages, type ListMoreQuery } from '../lib/pages';
import { accessNoticeIdOf } from '../model/bunchAccessNotice';
import { toBunchHomeDetail, toBunchSummaries } from '../model/bunchHome';
import {
  bunchHomeQueryOptions,
  draftBundlesQueryOptions,
  LIVE_REFRESH,
  PAUSED_REFRESH,
  publishedBundlesQueryOptions,
  useRefetchListsOnCountChange,
} from '../queries/bunchHome';
import { bunchHomeKeys } from '../queries/keys';

export type ServerBunchHome =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  /** 소속 번치가 없음(번치 없음 화면) */
  | { kind: 'no-bunch' }
  /** 보던 번치가 삭제됐거나 내보내짐(`409 BUNCH_008`). 안내 뒤 기본 번치를 다시 받음(5.2.3 상세 동작 4) */
  | { kind: 'unavailable'; noticeId: string }
  | {
      kind: 'ready';
      current: BunchHomeDetail;
      /** 전환 목록(지금 번치가 맨 위). 목록을 못 받으면 지금 번치 하나 */
      bunches: readonly BunchSummary[];
      /** 소속 번치가 최대 개수라 더 참여할 수 없음(목록을 못 받으면 false, 서버가 만들 때 다시 막음) */
      atBunchLimit: boolean;
      /** 완성된 번들 다시 받기(삭제된 번들을 눌렀을 때) */
      refreshCompleted: () => void;
      /** 완성된 번들 이어서 받기(그리드 끝) */
      completedMore: ListMoreQuery;
      /** 홈 정보는 왔고 번들 목록(완성·작성 중)은 아직 받는 중: 프로필은 그리고 번들 영역만 자리표시 */
      bundlesLoading: boolean;
    };

const NO_DRAFTS = { items: [] };

/**
 * 번치 홈의 프로필·개수와 완성된 번들·작성 중인 번들을 서버(가짜 서버 포함)에서 받아 화면 모양으로 돌려줌
 * 내 기본 번치(`members/me`, 마지막 사용 번치)를 지금 번치로 보고, 전환 목록은 `members/me/bunches`
 * 팔로우·알림·멤버 관리는 각 화면의 query가 따로 받음
 */
export function useServerBunchHome(): ServerBunchHome {
  const profile = useQuery(myProfileQueryOptions());
  const bunchId = profile.data?.bunch?.id;
  // 홈 정보(요청 1건)만 들어올 때·앱 복귀 때·보이는 동안 20초마다 다시 받아 다른 멤버의 가입·번들 개수를 확인
  // 전환 중에는 멈춤(저장 전 응답은 소속 없음, PAUSED_REFRESH)
  const switching = useIsMutating({ mutationKey: bunchHomeKeys.switchBunch() }) > 0;
  const home = useQuery({
    ...bunchHomeQueryOptions(bunchId),
    ...(switching ? PAUSED_REFRESH : LIVE_REFRESH),
  });
  const published = useInfiniteQuery(publishedBundlesQueryOptions(bunchId));
  const drafts = useQuery(draftBundlesQueryOptions(bunchId));
  const members = useQuery(bunchMembersQueryOptions(bunchId));
  useRefetchListsOnCountChange(bunchId, home.data, home.dataUpdatedAt);
  const myBunches = useQuery(myBunchesQueryOptions());

  const ready = (() => {
    // 홈 정보가 오면 번들 목록을 기다리지 않고 그림(받은 것부터 실제로, 번들 영역은 자리표시)
    if (!home.data) return undefined;
    // 번치 멤버는 작성 중인 번들 카드의 얼굴에만 쓰여, 못 받아도 얼굴만 비우고 홈은 보임
    const current = toBunchHomeDetail(
      home.data,
      { items: published.data ? itemsOfPages(published.data.pages, (bundle) => bundle.id) : [] },
      drafts.data ?? NO_DRAFTS,
      members.data ?? [],
    );
    if (!current) return undefined;
    // 전환 목록은 홈을 막지 않음: 못 받았거나 낡았어도 지금 번치는 보임
    const bunches: readonly BunchSummary[] = toBunchSummaries(myBunches.data, {
      id: current.id,
      name: current.name,
      imageSrc: current.imageSrc,
      alertCount: home.data.unreadCount ?? 0,
      access: 'active',
    });
    const atBunchLimit = myBunches.data
      ? myBunches.data.activeCount >= myBunches.data.maxActiveCount
      : false;
    return { current, bunches, atBunchLimit };
  })();

  if (profile.data && !profile.data.bunch) return { kind: 'no-bunch' };
  // 받아 둔 홈이 있어도 다시 받기에서 접근 불가 안내가 오면 그 번치는 더 볼 수 없음
  const noticeId = accessNoticeIdOf(home.error);
  if (noticeId) return { kind: 'unavailable', noticeId };
  // 번들 목록을 처음부터 못 받았으면 빈 목록으로 그리지 않고 오류(다시 받기 실패는 받아 둔 값을 그대로 씀)
  const bundlesFailed = (!published.data && published.isError) || (!drafts.data && drafts.isError);
  if (ready && !bundlesFailed) {
    return {
      kind: 'ready',
      ...ready,
      refreshCompleted: () => void published.refetch(),
      completedMore: published,
      bundlesLoading: !published.data || !drafts.data,
    };
  }
  // 내 번치가 아닌 응답(소속 null)이라 변환하지 못한 경우도 처음부터 못 받은 오류로 봄
  const unusable = home.data && !ready;
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

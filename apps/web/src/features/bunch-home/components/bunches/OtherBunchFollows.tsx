'use client';

import { isApiError } from '@app/api-core';
import { useQuery } from '@tanstack/react-query';
import { notFound, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_PATHS, followingTab } from '../../constants/paths';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { useFollowList } from '../../hooks/useFollowList';
import { useViewerStale } from '../../hooks/useViewerStale';
import { otherBunchHomeQueryOptions } from '../../queries/otherBunch';
import { BunchFollowsScreen, type FollowsTab } from '../BunchFollowsScreen';
import { BunchHomeError } from '../home/BunchHomeError';
import { BlockedBunchScreen } from './BlockedBunchScreen';

/**
 * `/bunches/[bunchId]/follows` 다른 번치의 팔로워·팔로잉(요청 승인은 그 번치 몫이라 없음). 없는 번치는 404
 * 이름·수·열람 범위는 그 번치 홈(지금 내 번치 명의), 볼 수 없으면(비공개, 팔로우 승인 전) 목록을 요청하지 않고 안내
 */
export function OtherBunchFollows({
  bunchId,
  initialTab,
}: {
  bunchId: string;
  initialTab: FollowsTab;
}) {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  // 번치가 없는 회원은 명의 없이 보기만(null), 아직 모르면 요청하지 않음(undefined)
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));
  const canView = home.data?.canViewRelations ?? false;
  const { followers, following, follow, unfollow } = useFollowList(bunchId, viewerId, canView);
  const { access } = useBlockRelation(bunchId);
  const viewerStale = useViewerStale(viewerId, home.data?.currentBunchId, me.refetch);

  // 내 번치: 지금 번치면 내 번치 목록으로, 다른 소속 번치면 프로필(전환 뒤 번치 탭)로
  const internal = home.data?.accessScope === 'INTERNAL' ? home.data : undefined;
  useEffect(() => {
    if (!internal) return;
    const mine =
      initialTab === 'following'
        ? followingTab(BUNCH_HOME_PATHS.follows)
        : BUNCH_HOME_PATHS.follows;
    router.replace(internal.isCurrentBunch ? mine : BUNCH_HOME_PATHS.otherBunch(bunchId));
  }, [internal, initialTab, bunchId, router]);

  const errorStatus = isApiError(home.error) ? home.error.status : undefined;
  if (errorStatus === 400 || errorStatus === 404) notFound();

  // 기록이 없으면 프로필로, 차단한 번치면 프로필도 접근 제한이라 피드로
  const back = () =>
    backOr(access === 'blocked' ? BUNCH_HOME_PATHS.feed : BUNCH_HOME_PATHS.otherBunch(bunchId));
  if (access !== 'visible')
    return <BlockedBunchScreen onBack={back} checking={access === 'checking'} />;
  if ((me.isError && !me.data) || (home.isError && !home.data)) {
    return (
      <BunchHomeError
        onRetry={() => {
          if (me.isError) void me.refetch();
          void home.refetch();
        }}
        onBack={back}
      />
    );
  }

  return (
    <BunchFollowsScreen
      // 내 번치로 옮기는 동안은 로딩
      bunchName={internal ? undefined : home.data?.bunch.name}
      followerCount={home.data?.followerCount ?? 0}
      followingCount={home.data?.followingCount ?? 0}
      followers={followers}
      following={following}
      // ponytail: 다시 받아도 명의가 어긋나면 버튼이 계속 막힘(프로필처럼 다시 시도 화면은 실서버 동작 확인 뒤)
      busy={viewerStale}
      viewerId={viewerId}
      initialTab={initialTab}
      locked={home.data !== undefined && !internal && !canView}
      onBack={back}
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}

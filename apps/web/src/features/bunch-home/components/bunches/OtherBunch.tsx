'use client';

import { isApiError } from '@app/api-core';
import { useQuery } from '@tanstack/react-query';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toDomainId } from '@/shared/api/ids';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { FOLLOW_STATUS, followIdOf, toOtherBunchProfile } from '../../model/otherBunch';
import { useSwitchBunchMutation } from '../../queries/bunchHome';
import {
  type FollowChange,
  otherBunchHomeQueryOptions,
  otherBunchPublishedQueryOptions,
  useFollowBunchMutation,
} from '../../queries/otherBunch';
import { BunchHomeError } from '../home/BunchHomeError';
import { BlockedBunchScreen } from './BlockedBunchScreen';
import { OtherBunchMoreMenu } from './OtherBunchMoreMenu';
import { OtherBunchScreen } from './OtherBunchScreen';

/**
 * `/bunches/[bunchId]` 다른 번치 프로필: 홈(`EXTERNAL`)·공개 번들과 팔로우를 지금 내 번치(기본 번치) 명의로
 * 내가 속한 번치면 그 번치로 전환해 번치 탭에서 보여 줌. 없는 번치는 404, 차단(샘플)한 번치는 접근 제한
 */
export function OtherBunch({ bunchId }: { bunchId: string }) {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  // 번치가 없는 회원은 명의 없이 보기만(null), 아직 모르면 요청하지 않음(undefined)
  const viewerId = me.isSuccess ? (me.data.bunch?.id ?? null) : undefined;
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));
  const canViewBundles = home.data?.canViewBundles ?? false;
  const published = useQuery(otherBunchPublishedQueryOptions(bunchId, viewerId, canViewBundles));
  const follow = useFollowBunchMutation(bunchId, viewerId);
  const switchBunch = useSwitchBunchMutation();
  const { me: reporter, access, block } = useBlockRelation(bunchId);
  // 이 화면에서 차단해 접근 제한 화면으로 바뀌면 제목으로 초점
  const [justBlocked, setJustBlocked] = useState(false);

  // 내 번치: 지금 번치면 그대로, 다른 소속 번치면 전환한 뒤 번치 탭으로(한 번만)
  const internal = home.data?.accessScope === 'INTERNAL' ? home.data : undefined;
  const moved = useRef(false);
  useEffect(() => {
    if (!internal || moved.current) return;
    moved.current = true;
    if (internal.isCurrentBunch) {
      router.replace(BUNCH_HOME_PATHS.home);
      return;
    }
    switchBunch.mutate(bunchId, {
      onSuccess: () => toastAfterNavigation(BUNCH_HOME_MESSAGES.switched(internal.bunch.name)),
      onError: () => toastAfterNavigation(BUNCH_HOME_MESSAGES.switchFailed),
      onSettled: () => router.replace(BUNCH_HOME_PATHS.home),
    });
  }, [internal, bunchId, router, switchBunch]);

  // 서버가 본 명의(지금 번치)가 캐시의 기본 번치와 다르면 기본 번치를 다시 받음(다른 기기에서 전환 등)
  const serverViewer = home.data?.currentBunchId;
  const viewerStale =
    serverViewer !== null &&
    serverViewer !== undefined &&
    viewerId !== undefined &&
    toDomainId(serverViewer) !== viewerId;
  const refetchMe = me.refetch;
  useEffect(() => {
    if (viewerStale) void refetchMe();
  }, [viewerStale, refetchMe]);
  // 다시 받았는데도 명의가 어긋나면(또는 다시 받기 실패) 팔로우를 막은 채 두지 않고 다시 시도 화면
  const viewerMismatch =
    viewerStale &&
    !me.isFetching &&
    Math.max(me.dataUpdatedAt, me.errorUpdatedAt) > home.dataUpdatedAt;
  // 처리 중 다시 눌러도 한 번만(isPending은 다음 렌더부터 반영), 차단이 끝날 때를 기다릴 수 있게 진행 중인 요청을 둠
  const inflight = useRef<Promise<unknown> | null>(null);

  // 없는 번치·잘못된 주소는 404
  const errorStatus = isApiError(home.error) ? home.error.status : undefined;
  if (errorStatus === 400 || errorStatus === 404) notFound();

  // 직접 진입이라 돌아갈 기록이 없으면 피드로(지금 입구가 피드)
  const back = () => backOr(BUNCH_HOME_PATHS.feed);
  if (access === 'blocked') return <BlockedBunchScreen onBack={back} focusTitle={justBlocked} />;
  // 내 정보·홈을 처음부터 못 받았거나, 다른 번치 판단에 필요한 값이 없는 응답이면 다시 시도
  if (
    (me.isError && !me.data) ||
    (home.isError && !home.data) ||
    (home.data && !home.data.accessScope) ||
    viewerMismatch
  ) {
    return (
      <BunchHomeError
        onRetry={() => {
          if (me.isError || viewerMismatch) void me.refetch();
          void home.refetch();
        }}
        onBack={back}
      />
    );
  }
  if (access === 'checking' || !home.data || internal) {
    return <BlockedBunchScreen onBack={back} checking />;
  }

  const data = home.data;
  const status = FOLLOW_STATUS[data.followState ?? 'NONE'];
  // 실패 안내·다시 받기는 mutation이 맡음(meta·onError)
  const run = async (change: FollowChange) => {
    if (inflight.current) throw new Error('already pending');
    const request = follow.mutateAsync(change);
    inflight.current = request;
    try {
      return await request;
    } finally {
      inflight.current = null;
    }
  };
  const unfollow = () => run({ kind: 'unfollow', followId: followIdOf(data) });
  // 차단: 진행 중인 팔로우가 끝나기를 기다린 뒤 최신 상태로 해제(요청 중에 차단해도 관계가 남지 않게)
  const unfollowForBlock = async () => {
    await inflight.current?.catch(() => {});
    const { data: latest } = await home.refetch();
    if (latest?.followState && latest.followState !== 'NONE') {
      await run({ kind: 'unfollow', followId: followIdOf(latest) });
    }
  };
  const bunch = toOtherBunchProfile(data, published.data);

  return (
    <OtherBunchScreen
      bunch={bunch}
      status={status}
      locked={!canViewBundles}
      // 명의를 다시 확인하는 동안에는 다른 번치 명의로 보내지 않게 막음
      busy={follow.isPending || viewerStale}
      // 번치가 없는 회원은 팔로우할 명의가 없어 버튼을 숨김
      canFollow={viewerId !== null}
      onBack={back}
      // 내 번치(신고 명의)를 알기 전에는 더보기를 숨김
      more={
        reporter && (
          <OtherBunchMoreMenu
            bunchName={bunch.name}
            reporterName={reporter.name}
            onBlock={() => {
              // 차단하면 팔로우 관계도 해제(화면설계서 2500:67470 2번). 차단은 아직 샘플
              block({ id: bunch.id, name: bunch.name, imageSrc: bunch.imageSrc });
              // 해제 실패는 mutation이 안내함(차단은 아직 샘플이라 서버 차단과 함께 처리하는 것은 차단 API 연결 때)
              void unfollowForBlock().catch(() => {});
              setJustBlocked(true);
            }}
            // 신고 API 연결 전이라 접수 안내만(시트가 토스트를 띄움)
            onReport={() => {}}
          />
        )
      }
      onFollow={() => run({ kind: 'follow' })}
      onUnfollow={unfollow}
    />
  );
}

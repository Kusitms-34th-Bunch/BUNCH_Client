'use client';

import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toDomainId } from '@/shared/api/ids';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { useViewerStale } from '../../hooks/useViewerStale';
import { FOLLOW_STATUS, followIdOf, toOtherBunchProfile } from '../../model/otherBunch';
import { useBlockBunchMutation, useReportBunchMutation } from '../../queries/blocks';
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
 * 내가 속한 번치면 그 번치로 전환해 번치 탭에서 보여 줌. 없는 번치는 404, 차단 관계(내가 차단·서버 403)면 접근 제한
 */
export function OtherBunch({ bunchId }: { bunchId: string }) {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  // 번치가 없는 회원은 명의 없이 보기만(null), 아직 모르면 요청하지 않음(undefined)
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));
  const canViewBundles = home.data?.canViewBundles ?? false;
  const published = useQuery(otherBunchPublishedQueryOptions(bunchId, viewerId, canViewBundles));
  const follow = useFollowBunchMutation(viewerId);
  const switchBunch = useSwitchBunchMutation();
  const { me: reporter, access } = useBlockRelation(bunchId);
  const blockBunch = useBlockBunchMutation(viewerId);
  const reportBunch = useReportBunchMutation(viewerId);
  // 이 화면에서 차단한 번치 이름(접근 제한으로 바꾸고 제목 초점 뒤 완료 토스트)
  const [justBlocked, setJustBlocked] = useState<string | null>(null);
  useEffect(() => {
    if (justBlocked) toast(BUNCH_HOME_MESSAGES.blockedDone(justBlocked));
  }, [justBlocked]);
  // 차단 처리 중(로딩 덮개, 다시 눌러도 한 번만: isPending은 다음 렌더부터 반영)
  const [blocking, setBlocking] = useState(false);
  const blockingRef = useRef(false);

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

  // 서버가 본 명의가 캐시의 기본 번치와 다르면 다시 받고, 다시 받아도 어긋나면 다시 시도 화면(다른 기기에서 전환 등)
  const { stale: viewerStale, mismatch: viewerMismatch } = useViewerStale(viewerId, home, me);
  // 처리 중 다시 눌러도 한 번만(isPending은 다음 렌더부터 반영), 차단이 끝날 때를 기다릴 수 있게 진행 중인 요청을 둠
  const inflight = useRef<Promise<unknown> | null>(null);

  // 직접 진입이라 돌아갈 기록이 없으면 피드로(지금 입구가 피드)
  const back = () => backOr(BUNCH_HOME_PATHS.feed);
  // 내가 차단한 번치는 서버 응답(404 등)보다 먼저 접근 제한
  if (access === 'blocked' || justBlocked) {
    return <BlockedBunchScreen onBack={back} focusTitle={justBlocked !== null} />;
  }
  // 없는 번치·잘못된 주소는 404
  const errorStatus = isApiError(home.error) ? home.error.status : undefined;
  if (errorStatus === 400 || errorStatus === 404) notFound();
  // ponytail: 상대가 나를 차단한 응답은 명세에 없어 403을 차단으로 봄(비공개는 403이 아니라 canView로 옴), 다른 이유일 수 있어 다시 시도 둠
  if (errorStatus === 403) {
    return (
      <BlockedBunchScreen
        onBack={back}
        onRetry={() => {
          void me.refetch();
          void home.refetch();
        }}
      />
    );
  }
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
          void me.refetch();
          if (viewerId !== undefined) void home.refetch();
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
    const request = follow.mutateAsync({ targetId: bunchId, change });
    inflight.current = request;
    try {
      return await request;
    } finally {
      inflight.current = null;
    }
  };
  const unfollow = () => run({ kind: 'unfollow', followId: followIdOf(data) });
  const bunch = toOtherBunchProfile(data, published.data);
  /**
   * 차단(화면설계서 2500:67470 2번): 진행 중인 팔로우가 끝나기를 기다려 최신 관계를 받은 뒤 차단하고, 성공하면 남은 팔로우를 해제
   * 그 사이 서버 명의가 바뀌었으면(다른 기기에서 전환) 이전 명의로 차단하지 않음. 실패 안내는 mutation
   */
  const block = async () => {
    if (blockingRef.current) return;
    blockingRef.current = true;
    setBlocking(true);
    try {
      await inflight.current?.catch(() => {});
      const { data: latest } = await home.refetch();
      const serverViewer = latest?.currentBunchId;
      if (serverViewer && toDomainId(serverViewer) !== viewerId) {
        void me.refetch();
        toast(BUNCH_HOME_MESSAGES.blockFailed);
        return;
      }
      const following = latest?.followState && latest.followState !== 'NONE';
      await blockBunch.mutateAsync({
        targetId: bunchId,
        followId: following ? followIdOf(latest) : undefined,
      });
      setJustBlocked(bunch.name);
    } catch {
      // 실패 안내는 mutation 공통 토스트(meta)
    } finally {
      blockingRef.current = false;
      setBlocking(false);
    }
  };

  return (
    <>
      {blocking ? <PageLoading /> : null}
      <OtherBunchScreen
        // 차단 중 안내는 화면의 늘 있는 상태 영역에 실음
        notice={blocking ? BUNCH_HOME_MESSAGES.blocking : undefined}
        bunch={bunch}
        status={status}
        locked={!canViewBundles}
        // 명의를 다시 확인하는 동안에는 다른 번치 명의로 보내지 않게 막음
        busy={follow.isPending || viewerStale || blocking}
        // 번치가 없는 회원은 팔로우할 명의가 없어 버튼을 숨김
        canFollow={viewerId !== null}
        canViewRelations={data.canViewRelations ?? false}
        onBack={back}
        // 내 번치(차단·신고 명의)를 모르거나 명의를 다시 확인하는 동안·차단 중에는 더보기를 숨김
        more={
          reporter &&
          !viewerStale &&
          !blocking && (
            <OtherBunchMoreMenu
              bunchName={bunch.name}
              reporterName={reporter.name}
              onBlock={() => void block()}
              onReport={(value) => reportBunch.mutateAsync({ targetId: bunchId, ...value })}
            />
          )
        }
        onFollow={() => run({ kind: 'follow' })}
        onUnfollow={unfollow}
      />
    </>
  );
}

'use client';

import { ApiError } from '@app/api-core';
import { ConfirmDialog, toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDeleteBundleMutation, useFetchLatestBundle } from '@/features/bundle/queries/bundles';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { BunchHomeActions } from '../../lib/types';
import type { BundleTab } from './BundleTabs';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { type PrefetchBundle, useOpenBundle } from '../../hooks/useOpenBundle';
import { useOpenDraft } from '../../hooks/useOpenDraft';
import { useServerBunchHome } from '../../hooks/useServerBunchHome';
import {
  bunchAccessNoticeQueryOptions,
  useDeleteBunchNoticeMutation,
  useRefreshBunchHomeLists,
  useRefreshCurrentBunch,
  useSwitchBunchMutation,
} from '../../queries/bunchHome';
import { usePrefetchMemberships } from '../../queries/memberships';
import { AccessNoticeDialog } from './AccessNoticeDialog';
import { BunchHomeError } from './BunchHomeError';
import { BunchHomeScreen } from './BunchHomeScreen';
import { BunchHomeSkeleton } from './BunchHomeSkeleton';
import { NoBunchScreen } from './NoBunchScreen';

// 번들은 번치 멤버가 2명 이상일 때 만들 수 있음(기획)
const MIN_MEMBERS_FOR_BUNDLE = 2;
// 번치당 작성 중인 번들은 최대 10개(기능명세 4.1.1·4.1.4)
const MAX_DRAFT_BUNDLES = 10;

/**
 * 작성 중인 번들 삭제 실패 중 창을 닫고 알릴 충돌(기능명세 5.3.2 예외 처리), 일시적 실패면 undefined
 * 404 이미 삭제됨, 409 `BUNDLE_002` 이미 발행됨, 403 권한 없음(그사이 관리자 권한을 잃었거나 참여에서 빠짐)
 */
const draftDeleteConflictMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return undefined;
  if (error.status === 404) return BUNCH_HOME_MESSAGES.draftAlreadyDeleted;
  if (error.code === 'BUNDLE_002') return BUNCH_HOME_MESSAGES.draftAlreadyPublished;
  if (error.status === 403) return BUNCH_HOME_MESSAGES.draftDeleteForbidden;
  return undefined;
};

type BunchHomeProps = {
  /** 처음 보일 번들 탭(주소 `?tab=drafts`) */
  initialTab?: BundleTab | undefined;
  /** 번들 상세 미리 받기(feed query, route가 조합). 없으면 확인 없이 이동 */
  prefetchBundle?: PrefetchBundle | undefined;
};

/** `/bunch` 번치 탭 화면: 서버 상태와 동작을 화면에 연결, 참여 번치가 없으면 번치 없음(「+」·「첫 번들 만들기」는 번들 만들기 화면으로 이동) */
export function BunchHome({ initialTab, prefetchBundle }: BunchHomeProps = {}) {
  const router = useRouter();
  // 번치에 나 혼자일 때 「+」·「첫 번들 만들기」를 막고 멤버 초대를 안내하는 창
  const openOverlay = useScreenOverlay();
  const server = useServerBunchHome();
  const { data: profile } = useQuery(myProfileQueryOptions());
  const deleteBundle = useDeleteBundleMutation(profile?.bunch?.id);
  const switchBunch = useSwitchBunchMutation();
  // 초안을 열기 전에 상세를 새로 받아 이미 삭제·발행됐는지 확인하고, 그렇다면 목록을 서버 기준으로 다시 받음(5.3.1)
  const draftCheck = {
    fetchDraft: useFetchLatestBundle(profile?.bunch?.id),
    ...useRefreshBunchHomeLists(profile?.bunch?.id),
  };
  // 삭제 직전 상태 확인부터 삭제 응답까지 한 번만(확인하는 동안은 mutation이 아직 pending이 아님)
  const deletingDraft = useRef(false);
  const openDraft = useOpenDraft({
    prefetchDraft: draftCheck.fetchDraft,
    onGone: draftCheck.refreshDrafts,
  });
  const deleteNotice = useDeleteBunchNoticeMutation();
  const refreshCurrentBunch = useRefreshCurrentBunch();
  const openBundle = useOpenBundle({
    viewerId: profile === undefined ? undefined : (profile.bunch?.id ?? null),
    prefetchBundle,
    onDeleted: () => {
      if (server.kind === 'ready') server.refreshCompleted();
    },
  });
  // 안내 뒤 기본 번치를 다시 받았는데도 같은 안내면 오류 화면(다시 시도)으로 둠(멈춘 로딩 방지)
  const [handledNoticeId, setHandledNoticeId] = useState<string>();
  const leaveUnavailable = (noticeId: string) =>
    void refreshCurrentBunch(profile?.bunch?.id).finally(() => setHandledNoticeId(noticeId));
  const serverBunches = server.kind === 'ready' ? server.bunches : [];
  // 번치 전환·접근 불가 안내 삭제·작성 중인 번들 삭제를 서버에 보냄
  const actions: BunchHomeActions = {
    // 새 번치 홈과 기본 번치를 받을 때까지 기다려 전환 토스트가 새 번치 화면과 함께 뜸
    switchBunch: (bunchId: string) => switchBunch.mutateAsync(bunchId),
    removeBunch: (bunchId: string) => {
      const noticeId = serverBunches.find((bunch) => bunch.id === bunchId)?.noticeId;
      if (!noticeId || deleteNotice.isPending) return;
      deleteNotice.mutate(noticeId, {
        onError: () => toast(BUNCH_HOME_MESSAGES.removeBunchFailed),
      });
    },
    // 삭제 요청 중에는 다시 보내지 않음(같은 카드를 연달아 누르면 두 번째가 404로 실패해 성공한 삭제가 실패로 보임)
    // 충돌·권한 거부는 안내 뒤 창을 닫고(목록은 mutation이 서버 기준으로 다시 받음), 그 밖의 실패는 창을 유지(기능명세 5.3.2)
    deleteDraftBundle: async (bundleId: string) => {
      if (deletingDraft.current || deleteBundle.isPending) return false;
      deletingDraft.current = true;
      // 충돌이면 안내하고 목록을 서버 기준으로 다시 받은 뒤 창을 닫음
      const conflictOf = (error: unknown) => {
        const conflict = draftDeleteConflictMessage(error);
        if (conflict) toast(conflict);
        return conflict !== undefined;
      };
      try {
        // 삭제 API는 발행본도 지우므로, 그사이 발행된 번들을 지우지 않게 직전에 상태를 확인(5.3.2 예외 처리)
        // ponytail: 확인과 삭제 사이의 짧은 틈은 서버가 발행본 삭제를 거절해야 완전히 막힘(백엔드 확인 필요)
        try {
          const latest = await draftCheck.fetchDraft(bundleId);
          if (latest.status === 'PUBLISHED') {
            toast(BUNCH_HOME_MESSAGES.draftAlreadyPublished);
            draftCheck.refreshDrafts();
            return true;
          }
        } catch (error) {
          if (conflictOf(error)) {
            draftCheck.refreshDrafts();
            return true;
          }
          toast(BUNCH_HOME_MESSAGES.deleteDraftFailed);
          return false;
        }
        try {
          await deleteBundle.mutateAsync(bundleId);
          toast(BUNCH_HOME_MESSAGES.draftDeleted);
          return true;
        } catch (error) {
          // 실패한 삭제는 mutation이 목록을 서버 기준으로 다시 받음
          if (conflictOf(error)) return true;
          toast(BUNCH_HOME_MESSAGES.deleteDraftFailed);
          return false;
        }
      } finally {
        deletingDraft.current = false;
      }
    },
  };

  const notReady = server.kind !== 'ready';
  // 접근 불가 안내를 받는 중인지(받으면 안내 창이 열리고, 실패하면 다른 번치로 넘어감)
  const notice = useQuery(
    bunchAccessNoticeQueryOptions(server.kind === 'unavailable' ? server.noticeId : undefined),
  );
  const noticeLoading = server.kind === 'unavailable' && notice.isPending && !notice.isError;
  // 번치 홈을 그린 뒤 더보기·멤버 관리가 바로 그려지게 멤버 목록을 미리 받음
  const prefetchMemberships = usePrefetchMemberships();
  const readyBunchId = notReady ? undefined : profile?.bunch?.id;
  useEffect(() => {
    if (readyBunchId) prefetchMemberships(readyBunchId);
  }, [readyBunchId, prefetchMemberships]);
  // 화면 상태가 바뀌어(로딩·오류) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (notReady) openOverlay.closeAll();
  }, [notReady, openOverlay]);

  if (server.kind === 'unavailable' && server.noticeId === handledNoticeId) {
    return <BunchHomeError onRetry={() => leaveUnavailable(server.noticeId)} />;
  }
  if (server.kind === 'loading' || server.kind === 'unavailable') {
    return (
      <>
        <p role="status" className="sr-only">
          {server.kind === 'loading' ? '번치를 불러오는 중이에요' : ''}
        </p>
        {/* 처음 받는 중은 화면 모양을 아니까 스켈레톤(저장해 둔 홈이 있으면 바로 그려져 거치지 않음) */}
        {server.kind === 'loading' ? <BunchHomeSkeleton /> : null}
        {/* 접근 불가 안내는 안내를 받는 동안만 로딩, 창이 열리면 덮개를 걷음(덮개가 남으면 앱 스플래시가 안내 창을 가림, AuthGate appReady) */}
        {noticeLoading ? <PageLoading /> : null}
        {/* 안내를 닫거나 받지 못하면 서버가 다시 고른 번치(또는 번치 없음)로 바뀜 */}
        {server.kind === 'unavailable' ? (
          <AccessNoticeDialog
            noticeId={server.noticeId}
            onClosed={() => leaveUnavailable(server.noticeId)}
            onFailed={() => leaveUnavailable(server.noticeId)}
          />
        ) : null}
      </>
    );
  }
  if (server.kind === 'error') return <BunchHomeError onRetry={server.retry} />;
  const data =
    server.kind === 'ready' ? { current: server.current, bunches: server.bunches } : null;
  const atBunchLimit = server.kind === 'ready' && server.atBunchLimit;

  if (!data) {
    return (
      <NoBunchScreen
        onCreateBunch={() => router.push(BUNCH_HOME_PATHS.createBunch)}
        onJoinBunch={() => router.push(BUNCH_HOME_PATHS.joinBunch)}
      />
    );
  }
  return (
    <>
      <BunchHomeScreen
        data={data}
        actions={actions}
        onAddBunch={() =>
          atBunchLimit
            ? toast(BUNCH_HOME_MESSAGES.bunchLimit)
            : router.push(BUNCH_HOME_PATHS.startBunch)
        }
        onOpenPlaces={() => router.push(BUNCH_HOME_PATHS.places)}
        onOpenBundle={(bundleId) => openBundle(data.current.id, bundleId)}
        initialTab={initialTab}
        completedMore={server.kind === 'ready' ? server.completedMore : undefined}
        // 멤버가 2명 미만이면 번들 만들기로 들어가지 않고 초대 안내, 초안이 이미 10개면 토스트(기능명세 4.1.1 상세 동작 1)
        onCreateBundle={() =>
          data.current.memberCount < MIN_MEMBERS_FOR_BUNDLE
            ? openOverlay((rootProps, close) => (
                <ConfirmDialog
                  {...rootProps}
                  title={BUNCH_HOME_MESSAGES.needMembersTitle}
                  description={BUNCH_HOME_MESSAGES.needMembersDescription}
                  confirmLabel={BUNCH_HOME_MESSAGES.needMembersInvite}
                  cancelLabel={BUNCH_HOME_MESSAGES.needMembersCancel}
                  onConfirm={() => {
                    close();
                    router.push(BUNCH_HOME_PATHS.invite);
                  }}
                />
              ))
            : (data.current.draftCount ?? 0) >= MAX_DRAFT_BUNDLES
              ? toast(BUNCH_HOME_MESSAGES.draftLimit)
              : router.push(BUNCH_HOME_PATHS.createBundle)
        }
        onOpenDraft={(bundleId) => void openDraft(bundleId)}
      />
    </>
  );
}

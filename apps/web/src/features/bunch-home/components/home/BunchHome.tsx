'use client';

import { ConfirmDialog, toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDeleteBundleMutation } from '@/features/bundle/queries/bundles';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBunchHome } from '../../hooks/useBunchHome';
import { useServerBunchHome } from '../../hooks/useServerBunchHome';
import { BunchHomeError } from './BunchHomeError';
import { BunchHomeScreen } from './BunchHomeScreen';
import { NoBunchScreen } from './NoBunchScreen';

// 번들은 번치 멤버가 2명 이상일 때 만들 수 있음(기획)
const MIN_MEMBERS_FOR_BUNDLE = 2;

type BunchHomeProps = {
  /** server: 프로필·완성된 번들을 서버에서 받음(기본), sample: 샘플 데이터(번치 전환 등 서버가 없는 동작을 확인하는 테스트) */
  source?: 'server' | 'sample';
};

/** `/bunch` 번치 탭 화면: 상태와 동작을 가져와 화면에 연결, 참여 번치가 없으면 번치 없음(「+」·「첫 번들 만들기」는 번들 만들기 화면으로 이동, 작성 중인 번들 열기는 아직 동작 없음) */
export function BunchHome({ source = 'server' }: BunchHomeProps) {
  const router = useRouter();
  // 번치에 나 혼자일 때 「+」·「첫 번들 만들기」를 막고 멤버 초대를 안내하는 창
  const openOverlay = useScreenOverlay();
  const sample = useBunchHome();
  const server = useServerBunchHome({ enabled: source === 'server' });
  const { data: profile } = useQuery({ ...myProfileQueryOptions(), enabled: source === 'server' });
  const deleteBundle = useDeleteBundleMutation(profile?.bunch?.id);
  // 서버 모드는 작성 중인 번들 삭제를 서버에 보냄(나머지 동작은 아직 샘플)
  const actions =
    source === 'server'
      ? {
          ...sample.actions,
          // 삭제 요청 중에는 다시 보내지 않음(같은 카드를 연달아 누르면 두 번째가 404로 실패해 성공한 삭제가 실패로 보임)
          deleteDraftBundle: (bundleId: string) => {
            if (deleteBundle.isPending) return;
            deleteBundle.mutate(bundleId, {
              onError: () => toast(BUNCH_HOME_MESSAGES.deleteDraftFailed, { fullWidth: true }),
            });
          },
        }
      : sample.actions;

  const notReady = source === 'server' && server.kind !== 'ready';
  // 화면 상태가 바뀌어(로딩·오류) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (notReady) openOverlay.closeAll();
  }, [notReady, openOverlay]);

  if (source === 'server') {
    if (server.kind === 'loading') {
      return (
        <>
          <p role="status" className="sr-only">
            번치를 불러오는 중이에요
          </p>
          <PageLoading />
        </>
      );
    }
    if (server.kind === 'error') return <BunchHomeError onRetry={server.retry} />;
  }
  // 서버 모드는 내 기본 번치 하나로 보임(번치 전환·팔로우·알림·멤버 관리는 샘플이라 전환 목록은 이 번치뿐)
  const data =
    source === 'server'
      ? server.kind === 'ready'
        ? { current: server.current, bunches: [server.summary] }
        : null
      : sample.data;

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
        onAddBunch={() => router.push(BUNCH_HOME_PATHS.startBunch)}
        onOpenPlaces={() => router.push(BUNCH_HOME_PATHS.places)}
        // 멤버가 2명 미만이면 번들 만들기로 들어가지 않고 초대 안내(번들은 멤버가 2명 이상일 때 만들 수 있음)
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
            : router.push(BUNCH_HOME_PATHS.createBundle)
        }
        onOpenDraft={(bundleId) => router.push(BUNCH_HOME_PATHS.draft(bundleId))}
      />
    </>
  );
}

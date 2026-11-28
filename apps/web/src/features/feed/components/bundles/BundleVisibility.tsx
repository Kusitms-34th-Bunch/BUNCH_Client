'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { apiErrorCode, isUnavailableTarget } from '@/shared/api/client/errorStatus';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import {
  managedBundleQueryOptions,
  useForgetBundle,
  useSavePublishedVisibilityMutation,
} from '../../queries/manageBundle';
import { BundleVisibilityScreen, type BundleVisibilityState } from './BundleVisibilityScreen';

type BundleVisibilityProps = {
  bunchId: string;
  bundleId: string;
  /** 비공개 번치면 「전체 공개」 대신 「일부 공개」(팔로워도 봄). route가 번치 정보를 읽어 넘김 */
  bunchPrivate: boolean;
};

/**
 * 번들 공개 범위 설정 화면과 번들 조회·공개 범위 저장 API를 잇는 컨테이너
 * 현재 값·버전·권한은 우리 번치 번들 조회(멤버 공개도 옴), 저장은 명세 057. 저장하면 상세로 돌아감
 */
export function BundleVisibility({ bunchId, bundleId, bunchPrivate }: BundleVisibilityProps) {
  const backOr = useBackOr();
  const router = useRouter();
  // 그사이 지워진 번들의 캐시·피드 카드는 이 화면이 떠날 때 비움(떠 있는 동안 비우면 빈 상세를 다시 받아 안내가 깜빡임)
  const forgetBundle = useForgetBundle(bundleId);
  const gone = useRef(false);
  useEffect(
    () => () => {
      if (gone.current) forgetBundle();
    },
    [forgetBundle],
  );
  const { viewer, viewerFailed, viewerFetching, retryViewer } = useFeedViewer();
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const detail = useQuery(managedBundleQueryOptions(bunchId, bundleId, viewerId));
  const save = useSavePublishedVisibilityMutation();
  // 메뉴를 숨기는 것만으로는 막히지 않아 직접 들어와도 서버가 수정 권한을 준 사람만, 발행본만 바꿈
  // 권한을 잃은 뒤 다시 받기가 볼 수 없음(400·403·404, 처음 불러오기 실패와 같은 기준)이면 받아 둔 값이 있어도 볼 수 없다는 안내로
  const lost = isUnavailableTarget(detail.error);
  const canEdit = !lost && detail.data?.status === 'PUBLISHED' && detail.data.permissions.canEdit;
  const back = () => backOr(FEED_PATHS.bundle(bunchId, bundleId));
  // 「다시 시도」가 끝나 버튼이 사라지면 그 화면의 제목(설정 제목이나 볼 수 없음 안내)으로 초점
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleAfterRetry = useRef(false);
  useEffect(() => {
    if (!focusTitleAfterRetry.current || detail.isFetching || viewerFetching) return;
    focusTitleAfterRetry.current = false;
    // 다시 실패해 버튼이 남았으면 초점도 그대로
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    titleRef.current?.focus({ preventScroll: true });
  });

  // 저장 실패(6.2.15 로직): 권한을 잃었으면 알리고 다시 받아 볼 수 없다는 안내로, 그사이 지워졌으면 피드로
  // 지워졌을 때 뒤로 가면 바로 앞의 지워진 상세라 피드로 바꿔 감(#604). 다른 곳에서 먼저 바꿔 버전이 어긋나면(BUNDLE_003) 최신 값을 다시 받고 고른 값은 둠
  const failSave = (error: unknown) => {
    const code = apiErrorCode(error);
    if (code === 'RESOURCE_001') {
      gone.current = true;
      router.replace(FEED_PATHS.home);
      toastAfterNavigation(text.bundleGone);
      return;
    }
    if (code === 'AUTH_002') {
      toast(text.permissionChanged);
      // 다시 받아 안내로 바뀌면 사라진 「수정하기」 대신 안내 제목으로 초점
      focusTitleAfterRetry.current = true;
      void detail.refetch();
      return;
    }
    if (code === 'BUNDLE_003') void detail.refetch();
    toast(text.actionFailed);
  };

  // 일시 오류(400·403·404 외)와 내 정보 실패는 다시 시도, 권한이 없거나 없는·지운 번들은 볼 수 없다는 안내
  // 이미 받은 상세가 있으면 다시 받기가 실패해도 고르던 화면을 그대로 둠
  const failed =
    !detail.data &&
    ((detail.isError && !isUnavailableTarget(detail.error)) ||
      (viewer === undefined && viewerFailed));
  // 권한을 알기 전에는 기다림(덮개가 헤더까지 덮음, 앱 공통)
  const state: BundleVisibilityState = failed
    ? 'failed'
    : detail.isPending
      ? 'loading'
      : canEdit
        ? 'ready'
        : 'unavailable';

  return (
    <BundleVisibilityScreen
      state={state}
      bunchPrivate={bunchPrivate}
      savedMemberOnly={detail.data?.visibility === 'PRIVATE'}
      saving={save.isPending}
      titleRef={titleRef}
      onBack={back}
      onRetry={() => {
        focusTitleAfterRetry.current = true;
        void (detail.isError ? detail.refetch() : retryViewer());
      }}
      onSave={(memberOnly) => {
        if (!detail.data || viewerId === undefined) return;
        save.mutate(
          {
            bunchId,
            bundleId,
            viewerId,
            value: memberOnly ? 'PRIVATE' : 'PUBLIC',
            expectedVersion: detail.data.visibilityVersion,
          },
          {
            onSuccess: () => {
              back();
              toastAfterNavigation(text.visibilitySaved);
            },
            onError: failSave,
          },
        );
      }}
    />
  );
}

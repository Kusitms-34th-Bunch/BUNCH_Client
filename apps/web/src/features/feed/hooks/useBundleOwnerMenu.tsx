'use client';

import { isApiError } from '@app/api-core';
import {
  ConfirmDialog,
  LineLockMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
  toast,
} from '@app/design-system';
import { MoreMenuSheet } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { FeedBundleDetail } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { useDeletePublishedBundleMutation, useForgetBundle } from '../queries/manageBundle';

/**
 * 메인 관리자 헤더 더보기와 번들 삭제(명세 048): 수정·공개 범위 이동, 삭제 확인과 삭제 뒤 이전 화면 이동
 * `removing`: 지우는 동안과 지운 뒤 떠날 때까지(화면이 덮개를 그림)
 */
export function useBundleOwnerMenu({
  bunchId,
  bundleId,
  viewerId,
  onPermissionChanged,
  onError,
}: {
  bunchId: string;
  bundleId: string;
  viewerId: string | null | undefined;
  /** 삭제 권한을 잃음(AUTH_002): 상세를 다시 받아 메뉴를 맞춤 */
  onPermissionChanged: () => void;
  onError: (_error: unknown) => void;
}) {
  const router = useRouter();
  const backOr = useBackOr();
  const openOverlay = useScreenOverlay();
  const removeBundle = useDeletePublishedBundleMutation();
  // 지운 번들의 캐시는 이 화면이 떠날 때 비움(떠 있는 동안 비우면 빈 상세를 다시 받아 안내가 깜빡임)
  const forgetBundle = useForgetBundle(bundleId);
  const deleted = useRef(false);
  useEffect(
    () => () => {
      if (deleted.current) forgetBundle();
    },
    [forgetBundle],
  );

  // 번들 삭제(Figma `5367:122187`, 명세 048): 창이 다 닫힌 뒤 서버에서 지우고 이전 화면으로 가서 알림(이 화면은 떠나므로 피드 위치)
  // 권한을 잃었으면 알리고 상세를 다시 받아 메뉴를 맞춤, 그사이 지워졌거나 볼 수 없게 됐으면 떠남
  const openDeleteBundle = () => {
    if (removeBundle.isPending) return;
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.deleteBundleTitle}
          description={text.deleteBundleDescription}
          cancelLabel={text.cancel}
          confirmLabel={text.deleteBundleConfirm}
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      () => {
        if (!confirmed) return;
        removeBundle.mutate(
          { bunchId, bundleId, viewerId: viewerId ?? null },
          {
            onSuccess: () => {
              deleted.current = true;
              backOr(FEED_PATHS.home);
              toastAfterNavigation(text.bundleDeleted);
            },
            onError: (error) => {
              if (isApiError(error) && error.code === 'AUTH_002') {
                toast(text.permissionChanged);
                onPermissionChanged();
                return;
              }
              onError(error);
            },
          },
        );
      },
    );
  };

  // 메인 관리자 헤더 더보기(Figma `5367:123992`): 「수정하기」/「공개 범위 설정」/「삭제하기」/「취소」
  const openOwnerMenu = (bundle: Pick<FeedBundleDetail, 'id' | 'canEdit' | 'canDelete'>) => {
    let next: (() => void) | undefined;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={text.bundleMore}
          cancelLabel={text.cancel}
          // 항목마다 그 권한이 있을 때만(수정·공개 범위는 수정 권한, 삭제는 삭제 권한)
          items={[
            ...(bundle.canEdit
              ? [
                  {
                    id: 'edit',
                    label: text.edit,
                    leftIcon: <LinePencilMediumIcon aria-hidden />,
                    onSelect: () => {
                      next = () => router.push(FEED_PATHS.bundleEdit(bunchId, bundle.id));
                      close();
                    },
                  },
                  {
                    id: 'visibility',
                    label: text.visibilitySetting,
                    leftIcon: <LineLockMediumIcon aria-hidden />,
                    onSelect: () => {
                      next = () => router.push(FEED_PATHS.bundleVisibility(bunchId, bundle.id));
                      close();
                    },
                  },
                ]
              : []),
            ...(bundle.canDelete
              ? [
                  {
                    id: 'delete',
                    label: text.deleteBundle,
                    tone: 'danger' as const,
                    leftIcon: <LineTrashcanMediumIcon aria-hidden />,
                    onSelect: () => {
                      next = openDeleteBundle;
                      close();
                    },
                  },
                ]
              : []),
          ]}
        />
      ),
      () => next?.(),
    );
  };

  return { openOwnerMenu, removing: removeBundle.isPending || removeBundle.isSuccess };
}

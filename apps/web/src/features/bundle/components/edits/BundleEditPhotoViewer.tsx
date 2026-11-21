'use client';

import { useRouter } from 'next/navigation';
import { type ComponentProps, useCallback, useEffect } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useBundleEditContext } from '../../contexts/bundleEditContext';
import { useRedirectMissingPhoto } from '../../hooks/useDraftExit';
import { usePhotoAddress } from '../../hooks/usePhotoAddress';
import { DraftPhotoViewer } from '../drafts/DraftPhotoViewer';
import { BundleEditError } from './BundleEditError';
import { EDIT_ACCESS } from './editAccess';

type BundleEditPhotoViewerProps = Pick<
  ComponentProps<typeof DraftPhotoViewer>,
  'sources' | 'sourcesPending' | 'bunchMembers'
> & {
  /** route에서 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/**
 * `/bunches/[bunchId]/bundles/[bundleId]/edit/photos/[photoId]/viewer` 수정 중 사진 크게 보기: 수정 화면과 같은 편집 상태를 봄
 * 사진함 원본의 올린 멤버·촬영 날짜는 route가 사진함 상태에서 받아 넘김(photo-box feature를 이 feature가 직접 잇지 않음)
 * 권한이 없거나 없는 번들·발행 전 번들이면 수정 화면으로 보내 그 화면이 판단하게 하고, 주소의 사진이 없으면 안내 뒤 수정 화면으로 돌아감
 */
export function BundleEditPhotoViewer({
  photoId,
  sources,
  sourcesPending,
  bunchMembers,
}: BundleEditPhotoViewerProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { bunchId, bundleId, state, actions } = useBundleEditContext();
  const editPath = BUNDLE_PATHS.edit(bunchId, bundleId);
  const kind = state.kind;
  const ready = state.kind === 'ready';
  const toPath = useCallback(
    (id: string, nextPhotoId: string) => BUNDLE_PATHS.editPhotoViewer(bunchId, id, nextPhotoId),
    [bunchId],
  );
  const { initialPhotoId, sync } = usePhotoAddress(
    photoId,
    bundleId,
    toPath,
    ready ? state.draft.photos.map((photo) => photo.id) : undefined,
  );
  // 발행 번들의 사진은 사진함과 따로 보관하므로 사진함에서 삭제됐다는 안내는 맞지 않음
  const present = useRedirectMissingPhoto(ready ? state.draft : undefined, initialPhotoId, {
    backPath: editPath,
    message: BUNDLE_MESSAGES.editPhotoMissing,
  });

  // 수정 화면이 먼저 상태를 판단하도록 준비되지 않은 상태에서는 그 화면으로 보냄
  useEffect(() => {
    if (kind === 'forbidden' || kind === 'missing' || kind === 'draft') {
      router.replace(editPath);
    }
  }, [kind, router, editPath]);

  if (state.kind === 'error')
    return <BundleEditError onRetry={state.retry} onBack={() => router.replace(editPath)} />;
  if (state.kind !== 'ready' || !present || initialPhotoId === undefined)
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

  return (
    <DraftPhotoViewer
      draft={state.draft}
      viewer={state.viewer}
      access={EDIT_ACCESS}
      actions={actions}
      initialPhotoId={initialPhotoId}
      sources={sources}
      sourcesPending={sourcesPending}
      bunchMembers={bunchMembers}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 수정 화면으로 이동
      onBack={() => backOr(editPath)}
      onPhotoChange={sync}
    />
  );
}

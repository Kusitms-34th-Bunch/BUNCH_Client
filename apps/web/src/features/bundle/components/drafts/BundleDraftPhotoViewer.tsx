'use client';

import { useRouter } from 'next/navigation';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useRedirectMissingDraft, useRedirectMissingPhoto } from '../../hooks/useDraftExit';
import { usePhotoAddress } from '../../hooks/usePhotoAddress';
import { DraftPhotoViewer } from './DraftPhotoViewer';

type BundleDraftPhotoViewerProps = {
  /** route에서 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/**
 * `/bunch/drafts/[draftId]/photos/[photoId]/viewer` 사진 크게 보기: 캡션 화면과 같은 초안 상태를 봄
 * 주소의 사진이 초안에 없으면 안내 토스트 뒤 작성 화면으로 돌아가고, 사진을 넘기면 주소가 따라 바뀜
 */
export function BundleDraftPhotoViewer({ photoId }: BundleDraftPhotoViewerProps) {
  const router = useRouter();
  const { state, actions } = useDraftContext();
  const ready = state.kind === 'ready';
  const draftId = ready ? state.draft.id : undefined;
  const { initialPhotoId, currentPhotoId, sync } = usePhotoAddress(
    photoId,
    draftId,
    BUNDLE_PATHS.photoViewer,
    ready ? state.draft.photos.map((photo) => photo.id) : undefined,
  );
  const present = useRedirectMissingPhoto(ready ? state.draft : undefined, initialPhotoId);

  useRedirectMissingDraft(state.kind === 'missing');

  if (state.kind !== 'ready' || !present || initialPhotoId === undefined) return <PageLoading />;

  const { draft, viewer } = state;
  return (
    <DraftPhotoViewer
      draft={draft}
      viewer={viewer}
      actions={actions}
      initialPhotoId={initialPhotoId}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 그 사진의 캡션 화면으로 이동
      onBack={() =>
        window.history.length > 1
          ? router.back()
          : router.replace(BUNDLE_PATHS.photo(draft.id, currentPhotoId ?? initialPhotoId))
      }
      onPhotoChange={sync}
    />
  );
}

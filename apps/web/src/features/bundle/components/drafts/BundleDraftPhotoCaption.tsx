'use client';

import { useRouter } from 'next/navigation';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useRedirectMissingPhoto } from '../../hooks/useDraftExit';
import { usePhotoAddress } from '../../hooks/usePhotoAddress';
import { usePhotoGalleryImport } from '../../hooks/usePhotoGalleryImport';
import { markPhotoAddEntry } from '../../lib/photoAddEntry';
import { DraftPhotoCaption } from './DraftPhotoCaption';

type BundleDraftPhotoCaptionProps = {
  /** route에서 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/**
 * `/bunch/drafts/[draftId]/photos/[photoId]` 사진 상세 캡션 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 캡션·순서·빼기는 바로 반영되어 뒤로가기로 작성 화면에 돌아오면 사진과 캡션에 나타남
 * 주소의 사진이 초안에 없으면 안내 토스트 뒤 작성 화면으로 돌아감
 */
export function BundleDraftPhotoCaption({ photoId }: BundleDraftPhotoCaptionProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const { state: boxState } = usePhotoBox();
  const importFromGallery = usePhotoGalleryImport(
    boxState.kind === 'ready' ? boxState.data.photos.length : 0,
  );
  const ready = state.kind === 'ready';
  const draftId = ready ? state.draft.id : undefined;
  const { initialPhotoId, sync } = usePhotoAddress(
    photoId,
    draftId,
    BUNDLE_PATHS.photo,
    ready ? state.draft.photos.map((photo) => photo.id) : undefined,
  );
  const present = useRedirectMissingPhoto(ready ? state.draft : undefined, initialPhotoId);

  if (state.kind !== 'ready' || !present || initialPhotoId === undefined) return <PageLoading />;

  const { draft, viewer } = state;
  return (
    <DraftPhotoCaption
      draft={draft}
      viewer={viewer}
      actions={actions}
      initialPhotoId={initialPhotoId}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
      onPhotoChange={sync}
      onOpenViewer={(id) => router.push(BUNDLE_PATHS.photoViewer(draft.id, id))}
      onImportFromBunchBox={() => {
        markPhotoAddEntry();
        router.push(BUNDLE_PATHS.photoAdd(draft.id));
      }}
      onImportFromGallery={importFromGallery}
    />
  );
}

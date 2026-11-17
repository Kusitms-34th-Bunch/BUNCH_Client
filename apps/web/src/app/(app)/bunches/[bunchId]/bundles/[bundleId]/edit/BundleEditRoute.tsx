'use client';

import type { DraftPhoto } from '@/features/bundle/lib/types';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { usePhotoGalleryImport } from '@/app/(app)/_hooks/usePhotoGalleryImport';
import { BundleEdit } from '@/features/bundle/components';
import { useBundleEditContext } from '@/features/bundle/contexts/bundleEditContext';
import { useRefreshEditedBundle } from '@/features/feed/queries/manageBundle';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';

// 사진함·번들이 준비되기 전의 빈 목록(참조를 고정해 훅의 effect가 매 렌더 다시 돌지 않게 함)
const NO_PHOTOS: readonly PhotoBoxPhoto[] = [];
const NO_DRAFT_PHOTOS: readonly DraftPhoto[] = [];

/**
 * 번들 수정 화면: feature끼리 직접 잇지 않으려고 route에서 연결함
 * 저장하면 피드·번들 상세 캐시를 맞춰 상세가 고친 내용을 새로 받게 하고, 「내 갤러리에서 가져오기」는 사진함에 올려 수정 중인 번들 맨 뒤에 붙임
 */
export function BundleEditRoute() {
  const { bundleId, state, actions } = useBundleEditContext();
  const refresh = useRefreshEditedBundle(bundleId);
  const { state: boxState } = usePhotoBox();
  const { importFromGallery, importing } = usePhotoGalleryImport({
    bunchId: boxState.kind === 'ready' ? boxState.data.bunch.id : undefined,
    boxPhotos: boxState.kind === 'ready' ? boxState.data.photos : NO_PHOTOS,
    photos: state.kind === 'ready' ? state.draft.photos : NO_DRAFT_PHOTOS,
    replacePhotos: actions.replacePhotos,
  });
  return (
    <BundleEdit
      onSaved={refresh}
      onImportFromGallery={importFromGallery}
      galleryImporting={importing}
    />
  );
}

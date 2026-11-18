'use client';

import type { DraftPhoto } from '@/features/bundle/lib/types';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { usePhotoGalleryImport } from '@/app/(app)/_hooks/usePhotoGalleryImport';
import { BundleDraft } from '@/features/bundle/components';
import { useDraftContext } from '@/features/bundle/contexts/draftContext';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';

// 사진함·번들이 준비되기 전의 빈 목록(참조를 고정해 훅의 effect가 매 렌더 다시 돌지 않게 함)
const NO_PHOTOS: readonly PhotoBoxPhoto[] = [];
const NO_DRAFT_PHOTOS: readonly DraftPhoto[] = [];

/**
 * 번들 작성 화면: feature끼리 직접 잇지 않으려고 route에서 연결함
 * 「내 갤러리에서 가져오기」는 사진함에 올려 작성 중인 번들 맨 뒤에 붙임
 */
export function BundleDraftRoute() {
  const { state, actions } = useDraftContext();
  const { state: boxState, retry: retryBox } = usePhotoBox();
  const { importFromGallery, importing } = usePhotoGalleryImport({
    bunchId: boxState.kind === 'ready' ? boxState.data.bunch.id : undefined,
    boxPhotos: boxState.kind === 'ready' ? boxState.data.photos : NO_PHOTOS,
    photos: state.kind === 'ready' ? state.draft.photos : NO_DRAFT_PHOTOS,
    replacePhotos: actions.replacePhotos,
    // 사진함을 받지 못해 가져올 수 없으면 사진함을 다시 받아 다음 시도부터 가져올 수 있게 함
    onUnavailable: retryBox,
  });
  return <BundleDraft onImportFromGallery={importFromGallery} galleryImporting={importing} />;
}

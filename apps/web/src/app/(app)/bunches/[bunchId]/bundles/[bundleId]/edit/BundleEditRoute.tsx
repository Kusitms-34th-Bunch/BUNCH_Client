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
  const { bunchId: routeBunchId, bundleId, state, actions } = useBundleEditContext();
  const refresh = useRefreshEditedBundle(bundleId);
  const { state: boxState, retry: retryBox } = usePhotoBox();
  const { importFromGallery, importing } = usePhotoGalleryImport({
    // 사진함은 내 기본 번치 기준이라 이 번들의 번치와 같을 때만 올림(다르면 다른 번치 사진함에 올라가지 않게 함)
    bunchId:
      boxState.kind === 'ready' && boxState.data.bunch.id === routeBunchId
        ? boxState.data.bunch.id
        : undefined,
    boxPhotos: boxState.kind === 'ready' ? boxState.data.photos : NO_PHOTOS,
    photos: state.kind === 'ready' ? state.draft.photos : NO_DRAFT_PHOTOS,
    replacePhotos: actions.replacePhotos,
    // 사진함을 받지 못해 가져올 수 없으면 사진함을 다시 받아 다음 시도부터 가져올 수 있게 함
    onUnavailable: retryBox,
  });
  return (
    <BundleEdit
      onSaved={refresh}
      onImportFromGallery={importFromGallery}
      galleryImporting={importing}
    />
  );
}

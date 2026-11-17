'use client';

import { BundleEdit } from '@/features/bundle/components';
import { useBundleEditContext } from '@/features/bundle/contexts/bundleEditContext';
import { usePhotoGalleryImport } from '@/features/bundle/hooks/usePhotoGalleryImport';
import { useRefreshEditedBundle } from '@/features/feed/queries/manageBundle';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';

/**
 * 번들 수정 화면: feature끼리 직접 잇지 않으려고 route에서 연결함
 * 저장하면 피드·번들 상세 캐시를 맞춰 상세가 고친 내용을 새로 받게 하고, 「내 갤러리에서 가져오기」는 사진함 상태로 가능 여부를 정함
 */
export function BundleEditRoute() {
  const { bundleId } = useBundleEditContext();
  const refresh = useRefreshEditedBundle(bundleId);
  const { state } = usePhotoBox();
  const importFromGallery = usePhotoGalleryImport(
    state.kind === 'ready' ? state.data.photos.length : 0,
  );
  return <BundleEdit onSaved={refresh} onImportFromGallery={importFromGallery} />;
}

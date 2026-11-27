import { useState } from 'react';
import type { PhotoBoxPreview } from '@/features/photo-box/lib/preview';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxState } from '@/features/photo-box/lib/types';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';

// 목 저장이 끝나기까지의 시간(화면 전체 로딩이 보이도록)
const MOCK_SAVE_DELAY_MS = 800;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
  retry: () => void;
};

/**
 * 번들 화면 테스트용 대역: 사진함 샘플 사진과 목 동작(실제 사진 API는 photo-box 테스트가 가짜 서버로 확인)
 */
export function usePhotoBoxFixture(preview?: PhotoBoxPreview): UsePhotoBoxResult {
  const [photos, setPhotos] = useState<readonly PhotoBoxPhoto[]>(photoBoxFixture.photos);

  const state: PhotoBoxState = (() => {
    if (preview === 'loading') return { kind: 'loading' };
    if (preview === 'error') return { kind: 'error' };
    if (preview === 'no-bunch') return { kind: 'no-bunch' };
    if (preview === 'empty') {
      return { kind: 'ready', data: { ...photoBoxFixture, photos: [] } };
    }
    return { kind: 'ready', data: { ...photoBoxFixture, photos } };
  })();

  const actions: PhotoBoxActions = {
    savePhotos: async (ids) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_SAVE_DELAY_MS));
      return { savedIds: ids, failedIds: [] };
    },
    // 번들 화면은 날짜 변경·삭제를 쓰지 않아 최소 동작만 둠(실제 동작은 photo-box 테스트가 확인)
    changePhotoDates: () => Promise.resolve(),
    deletePhotos: (ids) => {
      setPhotos((current) => current.filter((photo) => !ids.includes(photo.id)));
      return Promise.resolve({ removedCount: ids.length });
    },
  };

  return { state, actions, retry: () => undefined };
}

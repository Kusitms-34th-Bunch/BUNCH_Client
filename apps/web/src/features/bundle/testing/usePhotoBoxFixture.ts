import { useMemo, useState } from 'react';
import type { PhotoBoxPreview } from '@/features/photo-box/lib/preview';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxState } from '@/features/photo-box/lib/types';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import { applyDelete, applyTakenDate } from '@/features/photo-box/lib/photoActions';

// 목 저장이 끝나기까지의 시간(화면 전체 로딩이 보이도록)
const MOCK_SAVE_DELAY_MS = 800;
// 목 날짜 변경이 끝나기까지의 시간(시트의 「저장 중」 상태가 보이도록)
const MOCK_CHANGE_DATE_DELAY_MS = 500;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
};

/**
 * 번들 화면 테스트용 대역: 사진함 샘플 사진과 목 동작(실제 사진 API는 photo-box 테스트가 가짜 서버로 확인)
 */
export function usePhotoBoxFixture(preview?: PhotoBoxPreview): UsePhotoBoxResult {
  const [photos, setPhotos] = useState<readonly PhotoBoxPhoto[]>(photoBoxFixture.photos);

  const state = useMemo<PhotoBoxState>(() => {
    if (preview === 'loading') return { kind: 'loading' };
    if (preview === 'error') return { kind: 'error' };
    if (preview === 'no-bunch') return { kind: 'no-bunch' };
    if (preview === 'empty') {
      return { kind: 'ready', data: { ...photoBoxFixture, photos: [] } };
    }
    return { kind: 'ready', data: { ...photoBoxFixture, photos } };
  }, [preview, photos]);

  const actions: PhotoBoxActions = {
    savePhotos: async (ids) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_SAVE_DELAY_MS));
      return { savedIds: ids, failedIds: [] };
    },
    changePhotoDates: async (ids, date) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_CHANGE_DATE_DELAY_MS));
      setPhotos((current) => applyTakenDate(current, new Set(ids), date));
    },
    deletePhotos: (ids) => {
      const result = applyDelete(photos, new Set(ids), photoBoxFixture.viewer);
      setPhotos(result.photos);
      return Promise.resolve({ removedCount: result.removedCount });
    },
  };

  return { state, actions };
}

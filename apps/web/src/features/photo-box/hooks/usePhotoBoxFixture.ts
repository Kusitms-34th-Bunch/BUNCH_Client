import { useMemo, useState } from 'react';
import type { PhotoBoxPreview } from '../lib/preview';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { applyDelete, applyTakenDate } from '../lib/photoActions';

// 목 저장이 끝나기까지의 시간(화면 전체 로딩이 보이도록)
const MOCK_SAVE_DELAY_MS = 800;
// 목 날짜 변경이 끝나기까지의 시간(시트의 「저장 중」 상태가 보이도록)
const MOCK_CHANGE_DATE_DELAY_MS = 500;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
};

/**
 * 번들 만들기 화면이 쓰는 fixture 기반 사진함 상태와 목 동작. 번들 연동 이슈에서 API 기반 `usePhotoBox`로 바꾸고 이 hook은 없앰
 * 사진함 화면과 사진 크게 보기는 API 기반 `usePhotoBox`를 사용
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

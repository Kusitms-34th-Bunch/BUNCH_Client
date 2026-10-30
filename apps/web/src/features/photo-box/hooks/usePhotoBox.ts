import { useMemo, useState } from 'react';
import type { PhotoBoxPreview } from '../lib/preview';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { applyDelete } from '../lib/photoActions';

// 목 저장이 끝나기까지의 시간(사진마다 점 3개 로딩이 보이도록)
const MOCK_SAVE_DELAY_MS = 800;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
};

/**
 * 사진함 화면 상태와 동작의 호출 지점. 사진 목록·멤버 목록·저장·삭제 API 연결 전에는 fixture와 목 동작을 돌려줌
 * 연결하면 이 hook만 TanStack Query 상태(로딩·오류·번치 없음·목록)와 mutation으로 바꾸고, `preview`는 함께 없앰
 */
export function usePhotoBox(preview?: PhotoBoxPreview): UsePhotoBoxResult {
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
    deletePhotos: (ids) => {
      const result = applyDelete(photos, new Set(ids), photoBoxFixture.viewer);
      setPhotos(result.photos);
      return Promise.resolve({ removedCount: result.removedCount });
    },
  };

  return { state, actions };
}

import { useMemo } from 'react';
import type { PhotoBoxPreview } from '../lib/preview';
import type { PhotoBoxState } from '../lib/types';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';

/**
 * 사진함 화면 상태의 호출 지점. 사진 목록·멤버 목록 API 연결 전에는 fixture를 돌려줌
 * 연결하면 이 hook만 TanStack Query 상태(로딩·오류·번치 없음·목록)로 바꾸고, `preview`는 함께 없앰
 */
export function usePhotoBoxState(preview?: PhotoBoxPreview): PhotoBoxState {
  return useMemo(() => {
    if (preview === 'loading') return { kind: 'loading' };
    if (preview === 'error') return { kind: 'error' };
    if (preview === 'no-bunch') return { kind: 'no-bunch' };
    if (preview === 'empty') {
      return { kind: 'ready', data: { ...photoBoxFixture, photos: [] } };
    }
    return { kind: 'ready', data: photoBoxFixture };
  }, [preview]);
}

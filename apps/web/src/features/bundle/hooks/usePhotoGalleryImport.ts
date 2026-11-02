'use client';

import { toast } from '@app/design-system';
import { useCallback } from 'react';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { MAX_PHOTOS_IN_BOX } from '@/features/photo-box/lib/photoActions';

/**
 * 번들 사진 추가 시트의 「내 갤러리에서 가져오기」 호출 지점(기능 spec 4.3.7)
 * 사진함 올리기의 「앨범」과 같은 곳으로 이어져, 사진함이 가득 차면 열지 않고 토스트로만 알림
 * 기기 사진 선택(네이티브 bridge)과 올린 사진의 번들 반영은 연결 전이라, 열 수 있으면 `maxCount`(더 담을 수 있는 장수)만 정해 둠
 */
export function usePhotoGalleryImport(boxPhotoCount: number) {
  return useCallback(
    (_maxCount: number) => {
      if (boxPhotoCount >= MAX_PHOTOS_IN_BOX) {
        toast(PHOTO_BOX_MESSAGES.photoBoxFull, { fullWidth: true });
      }
    },
    [boxPhotoCount],
  );
}

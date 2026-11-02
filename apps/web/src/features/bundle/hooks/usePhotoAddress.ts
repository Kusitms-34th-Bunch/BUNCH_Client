'use client';

import { useCallback, useState } from 'react';
import { parsePhotoId } from '../lib/draftId';

// 보던 사진 id를 이 history 항목에 적어 두는 키
const PHOTO_ID_KEY = 'bundleDraftPhotoId';

const readSavedPhotoId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const state: unknown = window.history.state;
  if (typeof state !== 'object' || state === null) return undefined;
  const saved = (state as Record<string, unknown>)[PHOTO_ID_KEY];
  return typeof saved === 'string' ? parsePhotoId(saved) : undefined;
};

/**
 * 사진 상세 화면이 지금 보는 사진과 그 주소를 맞추는 hook
 * 넘길 때마다 Next 이동 없이 주소만 바꾸는데(`replaceState`), route의 사진 id는 처음 진입한 값으로 남으므로
 * 뒤로가기로 이 화면에 돌아올 때 보던 사진을 잃지 않게 보던 사진 id를 history 항목에도 적어 둠
 * `initialPhotoId`는 처음 한 번 정해지고, `currentPhotoId`는 지금 보는 사진을 따라감
 * 적어 둔 사진이 그 사이 초안에서 빠졌으면(크게 보기에서 삭제하고 돌아온 경우 등) 쫓겨나지 않게 주소의 사진, 그것도 없으면 첫 장으로 엶
 */
export function usePhotoAddress(
  routePhotoId: string | undefined,
  draftId: string | undefined,
  toPath: (_draftId: string, _photoId: string) => string,
  /** 지금 초안의 사진 id(초안이 준비되기 전에는 undefined) */
  photoIds: readonly string[] | undefined,
) {
  const [initialPhotoId] = useState(() => {
    const saved = readSavedPhotoId();
    if (saved === undefined || photoIds === undefined) return saved ?? routePhotoId;
    if (photoIds.includes(saved)) return saved;
    // 이 화면에 있다가 돌아온 경우라 사진이 빠진 것이지 잘못된 주소가 아님: 주소의 사진, 없으면 첫 장
    return routePhotoId !== undefined && photoIds.includes(routePhotoId)
      ? routePhotoId
      : photoIds[0];
  });
  const [currentPhotoId, setCurrentPhotoId] = useState(initialPhotoId);

  const sync = useCallback(
    (photoId: string) => {
      setCurrentPhotoId(photoId);
      if (draftId === undefined) return;
      window.history.replaceState(
        { ...(window.history.state as object | null), [PHOTO_ID_KEY]: photoId },
        '',
        toPath(draftId, photoId),
      );
    },
    [draftId, toPath],
  );

  return { initialPhotoId, currentPhotoId, sync };
}

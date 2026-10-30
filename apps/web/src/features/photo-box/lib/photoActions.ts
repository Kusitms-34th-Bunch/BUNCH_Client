import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';

/** 번들 하나에 담을 수 있는 사진 수(명세 3.3.4) */
export const MAX_BUNDLE_PHOTOS = 20;

/** 일반 멤버는 내가 올린 사진만, 관리자는 모든 사진을 삭제할 수 있음(함께 올린 사진은 올린 멤버 모두가 내 사진) */
export const canDeletePhotos = (photos: readonly PhotoBoxPhoto[], viewer: PhotoBoxViewer) =>
  viewer.isAdmin || photos.every((photo) => photo.uploaderIds.includes(viewer.memberId));

/**
 * 삭제 확인 창 문구를 가르는 종류(명세 3.3.5)
 * - own: 내가 혼자 올린 사진만
 * - others: 관리자가 다른 멤버 사진을 고름(내 사진이 섞여도 포함)
 * - co-uploaded: 함께 올린 사진만(내 이름만 빠짐)
 * - mixed: 혼자 올린 사진과 함께 올린 사진이 섞임
 */
export type DeleteKind = 'own' | 'others' | 'co-uploaded' | 'mixed';

export const getDeleteKind = (
  photos: readonly PhotoBoxPhoto[],
  viewer: PhotoBoxViewer,
): DeleteKind => {
  if (photos.some((photo) => !photo.uploaderIds.includes(viewer.memberId))) return 'others';
  const coUploaded = photos.filter((photo) => photo.uploaderIds.length > 1).length;
  if (coUploaded === 0) return 'own';
  return coUploaded === photos.length ? 'co-uploaded' : 'mixed';
};

export type DeleteResult = {
  photos: readonly PhotoBoxPhoto[];
  /** 목록에서 사라진 사진 수(함께 올린 사진에서 내 이름만 빠진 경우는 세지 않음) */
  removedCount: number;
};

/**
 * 삭제 결과를 목록에 반영: 내 사진과 관리자가 고른 다른 멤버 사진은 사라지고,
 * 함께 올린 사진은 내 이름만 빠짐(남은 올린 멤버가 없으면 사라짐)
 */
export const applyDelete = (
  photos: readonly PhotoBoxPhoto[],
  ids: ReadonlySet<string>,
  viewer: PhotoBoxViewer,
): DeleteResult => {
  let removedCount = 0;
  const next: PhotoBoxPhoto[] = [];
  for (const photo of photos) {
    if (!ids.has(photo.id)) {
      next.push(photo);
      continue;
    }
    const iUploaded = photo.uploaderIds.includes(viewer.memberId);
    const others = photo.uploaderIds.filter((id) => id !== viewer.memberId);
    if (iUploaded && others.length > 0) {
      next.push({ ...photo, uploaderIds: others });
      continue;
    }
    removedCount += 1;
  }
  return { photos: next, removedCount };
};

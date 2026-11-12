import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';

/** 번들 하나에 담을 수 있는 사진 수(명세 3.3.4) */
export const MAX_BUNDLE_PHOTOS = 20;

/** 번치 하나에 둘 수 있는 사진 수(명세 3.2.7). 가득 차면 올리기 시트를 열지 않음 */
export const MAX_PHOTOS_IN_BOX = 1000;

/** 일반 멤버는 내가 올린 사진만, 관리자는 모든 사진을 삭제할 수 있음(함께 올린 사진은 올린 멤버 모두가 내 사진) */
export const canDeletePhotos = (photos: readonly PhotoBoxPhoto[], viewer: PhotoBoxViewer) =>
  viewer.isAdmin || photos.every((photo) => photo.uploaderIds.includes(viewer.memberId));

/**
 * 날짜 바꾸기 확인 창 문구를 가르는 종류(명세 3.4.1). 확인 창을 거치지 않으면 undefined
 * - others: 관리자가 다른 멤버가 올린 사진만 고름(함께 올린 사진이 없음)
 * - includes-others: 관리자가 내 사진과 다른 멤버 사진을 함께 고르거나, 고른 사진에 함께 올린 사진이 있음
 * 일반 멤버는 내가 올린 사진만 바꿀 수 있고, 관리자라도 나 혼자 올린 사진만 고르면 확인 없이 진행
 */
export type DateConfirmKind = 'others' | 'includes-others';

export const getDateConfirmKind = (
  photos: readonly PhotoBoxPhoto[],
  viewer: PhotoBoxViewer,
): DateConfirmKind | undefined => {
  if (!viewer.isAdmin) return undefined;
  const needsConfirm = photos.some(
    (photo) => !photo.uploaderIds.includes(viewer.memberId) || photo.uploaderIds.length > 1,
  );
  if (!needsConfirm) return undefined;
  const othersOnly = photos.every(
    (photo) => !photo.uploaderIds.includes(viewer.memberId) && photo.uploaderIds.length === 1,
  );
  return othersOnly ? 'others' : 'includes-others';
};

/** 날짜를 바꾸기 전에 확인 창을 거치는지(명세 3.4.1) */
export const needsDateChangeConfirm = (photos: readonly PhotoBoxPhoto[], viewer: PhotoBoxViewer) =>
  getDateConfirmKind(photos, viewer) !== undefined;

/**
 * 삭제 확인 창 문구를 가르는 종류(명세 3.3.5)
 * - own: 내가 혼자 올린 사진만
 * - others: 관리자가 다른 멤버가 올린 사진만 고름
 * - includes-others: 관리자가 내 사진과 다른 멤버 사진을 함께 고름
 * - co-uploaded: 함께 올린 사진만(내 이름만 빠짐)
 * - mixed: 혼자 올린 사진과 함께 올린 사진이 섞임
 */
export type DeleteKind = 'own' | 'others' | 'includes-others' | 'co-uploaded' | 'mixed';

export const getDeleteKind = (
  photos: readonly PhotoBoxPhoto[],
  viewer: PhotoBoxViewer,
): DeleteKind => {
  const notMine = photos.filter((photo) => !photo.uploaderIds.includes(viewer.memberId)).length;
  if (notMine === photos.length) return 'others';
  if (notMine > 0) return 'includes-others';
  const coUploaded = photos.filter((photo) => photo.uploaderIds.length > 1).length;
  if (coUploaded === 0) return 'own';
  return coUploaded === photos.length ? 'co-uploaded' : 'mixed';
};

/** 함께 올린 사진 수(삭제해도 사진함에 남는 사진 수, 「다른 멤버도 올린 사진 M장은 사진함에 남아요.」의 M) */
export const countCoUploaded = (photos: readonly PhotoBoxPhoto[]) =>
  photos.filter((photo) => photo.uploaderIds.length > 1).length;

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

const TIME_PART = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/;
const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 고른 사진의 촬영 날짜를 `date`(기기 시간대의 그날)로 바꾸되 시각은 그대로 둠(시각이 없으면 00:00)
 * 사진함은 `takenAt`으로 섹션을 나누고 정렬하므로 바뀐 목록이 곧 재정렬 결과
 */
export const applyTakenDate = (
  photos: readonly PhotoBoxPhoto[],
  ids: ReadonlySet<string>,
  date: Date,
): PhotoBoxPhoto[] => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return photos.map((photo) => {
    if (!ids.has(photo.id)) return photo;
    const time = photo.takenAt ? (TIME_PART.exec(photo.takenAt)?.[1] ?? '00:00') : '00:00';
    return { ...photo, takenAt: `${day}T${time}` };
  });
};

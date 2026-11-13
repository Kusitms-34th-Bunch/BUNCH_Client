import type { Draft, DraftPhoto, DraftViewer } from './types';

/** 다른 멤버가 그 사진을 편집 중인지(내가 편집 중인 것은 제외) */
export const getPhotoEditors = (draft: Draft, viewer: DraftViewer, photoId: string) =>
  (draft.editing.photoEditors?.[photoId] ?? []).filter((memberId) => memberId !== viewer.memberId);

/** 사진 빼기가 어떻게 진행되는지: 1장이면 막고, 아니면 항상 확인을 거침(Figma 4850:62115) */
export type RemovePhotoKind = 'last' | 'confirm';

export const getRemovePhotoKind = (photos: readonly DraftPhoto[]): RemovePhotoKind =>
  photos.length <= 1 ? 'last' : 'confirm';

/** 사진을 빼고 나머지는 순서를 그대로 둠(1장이면 빼지 않음) */
export const removePhoto = (
  photos: readonly DraftPhoto[],
  photoId: string,
): readonly DraftPhoto[] =>
  photos.length <= 1 ? photos : photos.filter((photo) => photo.id !== photoId);

/** 사진을 다른 자리로 옮김. 자리는 0부터이고 범위를 벗어나면 맨 끝으로 맞춤 */
export const movePhoto = (
  photos: readonly DraftPhoto[],
  photoId: string,
  toIndex: number,
): readonly DraftPhoto[] => {
  const from = photos.findIndex((photo) => photo.id === photoId);
  const target = photos[from];
  if (!target) return photos;
  const rest = photos.filter((photo) => photo.id !== photoId);
  const to = Math.min(Math.max(0, toIndex), rest.length);
  if (to === from) return photos;
  return [...rest.slice(0, to), target, ...rest.slice(to)];
};

export type PhotoMovePlan = { photoId: string; previous: string | null; next: string | null };

/**
 * 현재 순서를 원하는 순서로 맞추는 이동 목록, 각 이동의 앞뒤 사진은 앞선 이동을 반영한 목록 기준
 * (서버는 이동 대상을 뺀 목록에서 서로 인접한 앞뒤 사진 사이로만 옮길 수 있음)
 */
export const planPhotoMoves = (
  current: readonly string[],
  desired: readonly string[],
): PhotoMovePlan[] => {
  const order = [...current];
  const plans: PhotoMovePlan[] = [];
  // 현재 목록에 없는 사진은 옮길 수 없어 건너뜀
  const known = desired.filter((photoId) => current.includes(photoId));
  known.forEach((photoId, index) => {
    if (order[index] === photoId) return;
    const from = order.indexOf(photoId);
    if (from < 0) return;
    order.splice(from, 1);
    order.splice(index, 0, photoId);
    plans.push({ photoId, previous: order[index - 1] ?? null, next: order[index + 1] ?? null });
  });
  return plans;
};

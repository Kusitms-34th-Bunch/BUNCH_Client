import { ALL_MEMBERS, type PhotoBoxPhoto } from './types';

/** 한 번에 고를 수 있는 사진 수(명세 3.3.2) */
export const MAX_SELECTION = 50;

/** 고른 사진 id를 누른 순서대로 담은 목록(번호는 순서에서 계산) */
export type PhotoSelection = readonly string[];

export type ToggleResult = {
  selection: PhotoSelection;
  /** 이미 최대 장수라 새로 고르지 못했을 때 true */
  rejected: boolean;
};

/** 누르면 해제하고(뒤 번호는 자연히 당겨짐), 아니면 맨 뒤에 추가. 최대 장수를 넘으면 그대로 두고 거절 표시 */
export const toggleSelection = (
  selection: PhotoSelection,
  photoId: string,
  max: number = MAX_SELECTION,
): ToggleResult => {
  if (selection.includes(photoId)) {
    return { selection: selection.filter((id) => id !== photoId), rejected: false };
  }
  if (selection.length >= max) return { selection, rejected: true };
  return { selection: [...selection, photoId], rejected: false };
};

/** 사진의 선택 번호(1부터). 고르지 않았으면 undefined */
export const getSelectionOrder = (
  selection: PhotoSelection,
  photoId: string,
): number | undefined => {
  const index = selection.indexOf(photoId);
  return index === -1 ? undefined : index + 1;
};

export type PruneResult = {
  selection: PhotoSelection;
  /** 목록에서 사라져 선택에서 빠진 장수 */
  removedCount: number;
};

/** 목록에 더는 없는 사진을 선택에서 빼고 남은 사진의 순서는 유지(번호는 다시 매겨짐) */
export const pruneSelection = (
  selection: PhotoSelection,
  existingIds: ReadonlySet<string>,
): PruneResult => {
  const next = selection.filter((id) => existingIds.has(id));
  return { selection: next, removedCount: selection.length - next.length };
};

/**
 * 필터 칩에 붙는 선택 개수: 「전체」는 고른 전체 장수, 멤버는 그 멤버가 올린 사진 중 고른 장수
 * 함께 올린 사진은 올린 멤버 모두에게 센다. 고른 사진이 없으면 모든 값이 0
 */
export const countSelectedByMember = (
  selection: PhotoSelection,
  photos: readonly PhotoBoxPhoto[],
): Readonly<Record<string, number>> => {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const counts: Record<string, number> = { [ALL_MEMBERS]: 0 };
  for (const id of selection) {
    const photo = byId.get(id);
    if (!photo) continue;
    counts[ALL_MEMBERS] = (counts[ALL_MEMBERS] ?? 0) + 1;
    for (const uploaderId of photo.uploaderIds) {
      counts[uploaderId] = (counts[uploaderId] ?? 0) + 1;
    }
  }
  return counts;
};

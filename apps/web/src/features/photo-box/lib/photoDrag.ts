import type { PhotoSection } from './photoDate';
import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';
import { canDeletePhotos, needsDateChangeConfirm } from './photoActions';

/** 섹션 날짜 키별 사진 id 순서. 끄는 동안 사진이 섹션 사이를 오가는 미리보기를 이 모양으로 다룸 */
export type SectionItems = Record<string, string[]>;

/** 끌 수 있는 사진: 처리가 끝난 사진 중 내가 올렸거나(함께 올린 사진 포함) 내가 관리자인 것(삭제와 같은 권한) */
export const canDragPhoto = (photo: PhotoBoxPhoto, viewer: PhotoBoxViewer) =>
  photo.status === 'ready' && canDeletePhotos([photo], viewer);

/** 관리자가 다른 멤버 사진이나 함께 올린 사진을 끌면 놓을 때 확인 창을 거침(날짜 바꾸기와 같은 기준) */
export const needsDragConfirm = (photo: PhotoBoxPhoto, viewer: PhotoBoxViewer) =>
  needsDateChangeConfirm([photo], viewer);

/** 섹션 목록에서 섹션별 사진 id 순서를 뽑음 */
export const toSectionItems = (sections: readonly PhotoSection[]): SectionItems =>
  Object.fromEntries(
    sections.map((section) => [section.dateKey, section.photos.map((photo) => photo.id)]),
  );

/** 사진이 들어 있는 섹션의 키(없으면 undefined) */
export const findSectionKey = (items: SectionItems, photoId: string): string | undefined =>
  Object.keys(items).find((key) => items[key]?.includes(photoId));

/**
 * 끄는 사진을 `targetKey` 섹션의 `index` 자리로 옮긴 미리보기(주변 사진이 비켜 자리를 보여 줌)
 * 같은 섹션 안 이동은 자리만 바꾸고, 없는 섹션이나 이미 그 자리면 같은 객체를 돌려줌
 */
export const moveItem = (
  items: SectionItems,
  photoId: string,
  targetKey: string,
  index: number,
): SectionItems => {
  const fromKey = findSectionKey(items, photoId);
  const target = items[targetKey];
  if (fromKey === undefined || target === undefined) return items;

  const rest = (items[fromKey] ?? []).filter((id) => id !== photoId);
  const base = fromKey === targetKey ? rest : target;
  const at = Math.max(0, Math.min(index, base.length));
  const nextTarget = [...base.slice(0, at), photoId, ...base.slice(at)];

  if (fromKey === targetKey && nextTarget.every((id, i) => id === items[targetKey]?.[i])) {
    return items;
  }
  return fromKey === targetKey
    ? { ...items, [targetKey]: nextTarget }
    : { ...items, [fromKey]: rest, [targetKey]: nextTarget };
};

/** 'YYYY-MM-DD' 섹션 키를 기기 시간대의 그날 0시로 바꿈(날짜 바꾸기 동작에 넘기는 값) */
export const dateFromKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
};

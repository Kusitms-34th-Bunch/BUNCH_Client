import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import type { Draft, DraftPhoto, DraftViewer } from './types';
import { MAX_PHOTOS } from '../constants/messages';
import { getPhotoEditors } from './photos';

/** 사진함 사진으로 번들 사진을 만들 때의 id: 사진함 사진 id에 `draft-`를 붙임(같은 사진을 다시 더해도 같은 id) */
export const toDraftPhotoId = (sourcePhotoId: string) => `draft-${sourcePhotoId}`;

/** 사진함 사진 하나를 번들 사진으로 바꿈. 올린 멤버는 첫 번째 */
export const toDraftPhoto = (source: PhotoBoxPhoto): DraftPhoto => ({
  id: toDraftPhotoId(source.id),
  src: source.src,
  alt: source.alt,
  takenAt: source.takenAt,
  uploaderId: source.uploaderIds[0] ?? '',
  sourcePhotoId: source.id,
});

/** 사진 추가 화면이 처음 선택해 둘 사진함 사진 id: 번들 순서대로, 사진함에 대응이 없는 사진은 뺌 */
export const getInitialSelection = (photos: readonly DraftPhoto[]): readonly string[] =>
  photos.flatMap((photo) => (photo.sourcePhotoId ? [photo.sourcePhotoId] : []));

/** 선택 목록에 나타나지 않지만 20장 한도에는 드는 사진 수(사진함에 대응이 없는 번들 사진) */
export const countUnlinked = (photos: readonly DraftPhoto[]): number =>
  photos.filter((photo) => !photo.sourcePhotoId).length;

/** 사진 추가 화면에서 고를 수 있는 최대 장수 */
export const getMaxSelectable = (photos: readonly DraftPhoto[]): number =>
  Math.max(0, MAX_PHOTOS - countUnlinked(photos));

/** 처음 상태와 번호까지 같은지: 같으면 「적용하기」가 꺼져 있음 */
export const isSameSelection = (
  initial: readonly string[],
  selection: readonly string[],
): boolean =>
  initial.length === selection.length && initial.every((id, index) => id === selection[index]);

/** 선택에서 풀려 번들에서 빠질 사진 */
export const getRemovedPhotos = (
  photos: readonly DraftPhoto[],
  selection: readonly string[],
): readonly DraftPhoto[] =>
  photos.filter((photo) => photo.sourcePhotoId && !selection.includes(photo.sourcePhotoId));

/**
 * 적용한 결과 번들 사진: 선택 순서대로 이어 가고(이미 있던 사진은 그대로 둠) 새로 고른 사진은 뒤에 붙음
 * 사진함에 대응이 없는 사진은 선택에 나타나지 않으므로 뺄 수 없어 맨 뒤에 그대로 둠
 */
export const applySelection = (
  photos: readonly DraftPhoto[],
  selection: readonly string[],
  sources: readonly PhotoBoxPhoto[],
): readonly DraftPhoto[] => {
  const existing = new Map(
    photos.flatMap((photo) => (photo.sourcePhotoId ? [[photo.sourcePhotoId, photo] as const] : [])),
  );
  const bySource = new Map(sources.map((source) => [source.id, source]));
  const linked = selection.flatMap((id) => {
    const kept = existing.get(id);
    if (kept) return [kept];
    const source = bySource.get(id);
    return source ? [toDraftPhoto(source)] : [];
  });
  return [...linked, ...photos.filter((photo) => !photo.sourcePhotoId)];
};

/** 사진함 사진 id로 번들 사진을 찾아, 다른 멤버가 편집 중이면 true(그 사진은 선택에서 풀 수 없음) */
export const isSourceLocked = (
  draft: Draft,
  viewer: DraftViewer,
  sourcePhotoId: string,
): boolean => {
  const photo = draft.photos.find((candidate) => candidate.sourcePhotoId === sourcePhotoId);
  return photo !== undefined && getPhotoEditors(draft, viewer, photo.id).length > 0;
};

import type { Draft, DraftPhoto, DraftViewer } from './types';
import { CAPTION_MAX_LENGTH } from '../constants/messages';

/** 캡션을 최대 글자 수로 자르고 넘쳤는지 알려 줌(붙여넣기로 한 번에 넘쳐도 앞 200자는 남김) */
export const clampCaption = (value: string): { text: string; exceeded: boolean } =>
  value.length > CAPTION_MAX_LENGTH
    ? { text: Array.from(value).slice(0, CAPTION_MAX_LENGTH).join(''), exceeded: true }
    : { text: value, exceeded: false };

/** 다른 멤버가 그 사진을 편집 중인지(내가 편집 중인 것은 제외) */
export const getPhotoEditors = (draft: Draft, viewer: DraftViewer, photoId: string) =>
  (draft.editing.photoEditors?.[photoId] ?? []).filter((memberId) => memberId !== viewer.memberId);

/** 사진 빼기가 어떻게 진행되는지: 1장이면 막고, 캡션이 있으면 확인, 아니면 바로 */
export type RemovePhotoKind = 'last' | 'captioned' | 'direct';

export const getRemovePhotoKind = (
  photos: readonly DraftPhoto[],
  photo: DraftPhoto,
): RemovePhotoKind => {
  if (photos.length <= 1) return 'last';
  return photo.caption.trim() === '' ? 'direct' : 'captioned';
};

export const setPhotoCaption = (
  photos: readonly DraftPhoto[],
  photoId: string,
  caption: string,
): readonly DraftPhoto[] =>
  photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo));

/** 사진을 빼고 나머지는 순서를 그대로 둠(1장이면 빼지 않음) */
export const removePhoto = (
  photos: readonly DraftPhoto[],
  photoId: string,
): readonly DraftPhoto[] =>
  photos.length <= 1 ? photos : photos.filter((photo) => photo.id !== photoId);

/** 사진을 다른 자리로 옮김(캡션은 사진 객체에 있어 함께 따라감). 자리는 0부터이고 범위를 벗어나면 맨 끝으로 맞춤 */
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

import type { PublishedEditInput } from '../api/bundleEdit';
import type { Draft, DraftLocation, DraftPhoto } from './types';
import {
  applyLocationOp,
  isPendingLocation,
  type LocationOp,
  PENDING_ID_PREFIX,
} from './locationOps';

/** 수정 화면의 편집 값(저장 전까지 이 화면에서만 바뀌고 서버에는 보내지 않음) */
export type EditValues = {
  title: string;
  /** 'YYYY-MM-DD', 없으면 null */
  date: string | null;
  photos: readonly DraftPhoto[];
  locations: readonly DraftLocation[];
};

// 바꾼 필드만 담음(없는 필드는 서버에서 받은 값). 날짜는 null이 「지운 값」이라 undefined로 「바꾸지 않음」을 나타냄
export type Overrides = { [Key in keyof EditValues]?: EditValues[Key] };

// 이 화면에서 더한 위치는 서버 id가 아직 없지만 눌러서 바꾸거나 옮길 수 있어야 하므로 `pending:` 표시를 바꿔 「new:」로 둠
const NEW_ID_PREFIX = 'new:';
export const applyOp = (
  locations: readonly DraftLocation[],
  op: LocationOp,
): readonly DraftLocation[] =>
  applyLocationOp(locations, op).map((location) =>
    isPendingLocation(location)
      ? { ...location, id: `${NEW_ID_PREFIX}${location.id.slice(PENDING_ID_PREFIX.length)}` }
      : location,
  );

export const sameIds = (a: readonly { id: string }[], b: readonly { id: string }[]) =>
  a.length === b.length && a.every((item, index) => item.id === b[index]?.id);

export const sameLocations = (a: readonly DraftLocation[], b: readonly DraftLocation[]) =>
  a.length === b.length &&
  a.every(
    (item, index) =>
      item.provider === b[index]?.provider &&
      item.externalId === b[index]?.externalId &&
      item.name === b[index]?.name &&
      item.address === b[index]?.address,
  );

/**
 * 충돌(BUNDLE_003) 뒤 편집 값 정리: 내가 연 뒤 서버에서 바뀐 필드는 내 편집을 버리고 최신 값을 보임
 * 편집은 전체 목록을 덮어쓰는 저장이라, 서버에서 바뀐 필드의 내 편집을 그대로 다시 보내면 다른 곳의 변경을 조용히 지움
 * 서버에서 바뀌지 않은 필드의 편집은 남기므로, 다시 저장하면 내가 본 값 위에서만 고쳐짐
 */
export const reconcileOverrides = (
  overrides: Overrides,
  before: Draft,
  after: Draft,
): Overrides => {
  const next = { ...overrides };
  if (before.title.trim() !== after.title.trim()) delete next.title;
  if (before.date !== after.date) delete next.date;
  if (!sameIds(before.photos, after.photos)) delete next.photos;
  if (!sameLocations(before.locations, after.locations)) delete next.locations;
  return next;
};

/**
 * 저장 요청의 사진 목록: 남긴 번들 사진은 번들 사진 id로, 사진함에서 새로 가져온 사진은 사진함 원본 id로 보냄
 * 보낼 id가 없는 사진이 하나라도 있으면 undefined
 */
export const toEditPhotos = (
  photos: readonly DraftPhoto[],
  originalIds: ReadonlySet<string>,
): PublishedEditInput['photos'][number][] | undefined => {
  const result: PublishedEditInput['photos'][number][] = [];
  for (const photo of photos) {
    if (originalIds.has(photo.id)) result.push({ bundlePhotoId: photo.id });
    else if (photo.sourcePhotoId) result.push({ photoId: photo.sourcePhotoId });
    else return undefined;
  }
  return result;
};

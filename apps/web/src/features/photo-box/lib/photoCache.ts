type CachedPhoto = { id: string; uploaderIds?: readonly string[] };
type PhotoPages = { pages: { photos: CachedPhoto[] }[] };

/**
 * 낙관 처리로 뺀 사진과 원래 자리. 자리는 숫자가 아니라 뒤에 있던 사진들로 기억함
 * 겹친 삭제가 목록을 당겨 놓아도 남아 있는 뒤 사진 앞에 넣으면 순서가 맞음
 */
export type RemovedPhoto = { page: number; photo: CachedPhoto; following: string[] };

// 함께 올린 사진(올린 멤버가 둘 이상)은 삭제해도 사진함에 남으므로(명세 3.3.5) 빼지 않음
const disappears = (photo: CachedPhoto, ids: ReadonlySet<string>) =>
  ids.has(photo.id) && (photo.uploaderIds?.length ?? 1) <= 1;

/**
 * 쪽 단위 사진 목록 캐시에서 삭제로 사라질 사진을 빼고, 뺀 사진과 자리를 함께 돌려줌. 모르는 모양은 그대로
 * `kept`: 골랐지만 함께 올린 사진이라 목록에 남는 사진 id
 */
export const withoutPhotos = (
  data: unknown,
  ids: ReadonlySet<string>,
): { data: unknown; removed: RemovedPhoto[]; kept: string[] } => {
  if (!isPhotoPages(data)) return { data, removed: [], kept: [] };
  const removed: RemovedPhoto[] = [];
  const kept: string[] = [];
  const pages = data.pages.map((page, pageIndex) => ({
    ...page,
    photos: page.photos.filter((photo, index) => {
      if (!disappears(photo, ids)) {
        if (ids.has(photo.id)) kept.push(photo.id);
        return true;
      }
      const following = page.photos.slice(index + 1).map((next) => next.id);
      removed.push({ page: pageIndex, photo, following });
      return false;
    }),
  }));
  return { data: { ...data, pages }, removed, kept };
};

/** 실패한 삭제가 뺀 사진만 원래 자리에 되돌림(그 사이 다른 삭제가 뺀 사진은 그대로). 이미 있으면 넣지 않음 */
export const withPhotosBack = (data: unknown, removed: readonly RemovedPhoto[]): unknown => {
  if (!isPhotoPages(data) || removed.length === 0) return data;
  const present = new Set(data.pages.flatMap((page) => page.photos.map((photo) => photo.id)));
  const pages = data.pages.map((page) => ({ ...page, photos: [...page.photos] }));
  // 뒷자리부터 넣어야 뒤 사진이 먼저 자리를 잡아 앞 사진의 기준이 됨
  for (const entry of [...removed].reverse()) {
    const target = pages[entry.page];
    if (!target || present.has(entry.photo.id)) continue;
    const next = entry.following.find((id) => present.has(id));
    const at = next ? target.photos.findIndex((item) => item.id === next) : -1;
    target.photos.splice(at < 0 ? target.photos.length : at, 0, entry.photo);
    present.add(entry.photo.id);
  }
  return { ...data, pages };
};

const isPhotoPages = (data: unknown): data is PhotoPages =>
  typeof data === 'object' &&
  data !== null &&
  'pages' in data &&
  Array.isArray(data.pages) &&
  data.pages.every(
    (page: unknown) =>
      typeof page === 'object' && page !== null && 'photos' in page && Array.isArray(page.photos),
  );

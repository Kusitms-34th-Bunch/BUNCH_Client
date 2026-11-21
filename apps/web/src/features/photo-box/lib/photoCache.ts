/** 쪽 단위 사진 목록 캐시에서 그 사진들을 뺌(삭제 낙관 처리). 모르는 모양은 그대로 돌려줌 */
export const withoutPhotos = (data: unknown, removed: ReadonlySet<string>): unknown => {
  if (!isPhotoPages(data)) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      photos: page.photos.filter((photo) => !removed.has(photo.id)),
    })),
  };
};

type PhotoPages = { pages: { photos: { id: string }[] }[] };

const isPhotoPages = (data: unknown): data is PhotoPages =>
  typeof data === 'object' &&
  data !== null &&
  'pages' in data &&
  Array.isArray(data.pages) &&
  data.pages.every(
    (page: unknown) =>
      typeof page === 'object' && page !== null && 'photos' in page && Array.isArray(page.photos),
  );

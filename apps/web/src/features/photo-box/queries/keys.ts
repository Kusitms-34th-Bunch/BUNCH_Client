// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
export const photoBoxKeys = {
  all: ['photo-box'] as const,
  // 사진 목록(날짜별·날짜 없음)·상세·사용량은 모두 이 아래에 두어 삭제 뒤 한 번에 무효화
  photos: (bunchId: string | undefined) => [...photoBoxKeys.all, 'photos', bunchId] as const,
  // 삭제 뒤 한 번에 무효화되도록 photos 아래에 둠
  photoDetail: (bunchId: string | undefined, photoId: string) =>
    [...photoBoxKeys.photos(bunchId), 'detail', photoId] as const,
  datedPhotos: (bunchId: string | undefined) => [...photoBoxKeys.photos(bunchId), 'dated'] as const,
  undatedPhotos: (bunchId: string | undefined) =>
    [...photoBoxKeys.photos(bunchId), 'undated'] as const,
};

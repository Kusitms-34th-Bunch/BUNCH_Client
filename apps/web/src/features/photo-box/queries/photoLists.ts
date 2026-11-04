import { queryOptions, skipToken } from '@tanstack/react-query';
import { getDatedPhotosPage, getUndatedPhotosPage } from '../api/photos';
import { photoBoxKeys } from './keys';

type PhotosPage = Awaited<ReturnType<typeof getDatedPhotosPage>>;
type PageRequest = (_cursor: string | undefined) => Promise<PhotosPage>;

// 사진함은 멤버 필터·날짜 묶기를 화면에서 하므로 마지막 쪽까지 이어서 불러와 한 목록으로 합침
// 번치 사진 상한(1000장)이 있어 요청 수가 제한됨
const fetchAllPages = async (request: PageRequest) => {
  const photos: PhotosPage['photos'] = [];
  let cursor: string | undefined;
  // 이미 받은 cursor가 다시 오면(같은 cursor 반복·A→B→A 순환) 무한 반복하지 않고 중단
  const seen = new Set<string>();
  do {
    const page = await request(cursor);
    // 그 쪽에서 받은 사진은 남기고, 이미 본 cursor가 다시 오면 거기서 끝냄
    photos.push(...page.photos);
    if (page.nextCursor !== null && seen.has(page.nextCursor)) break;
    if (page.nextCursor !== null) seen.add(page.nextCursor);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return photos;
};

/** 날짜를 아는 사진 전체(최신순). 번치를 아직 모르면 요청하지 않음 */
export const datedPhotosQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: photoBoxKeys.datedPhotos(bunchId),
    queryFn: bunchId
      ? ({ signal }) => fetchAllPages((cursor) => getDatedPhotosPage({ bunchId, cursor, signal }))
      : skipToken,
  });

/** 날짜를 모르는 사진 전체 */
export const undatedPhotosQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: photoBoxKeys.undatedPhotos(bunchId),
    queryFn: bunchId
      ? ({ signal }) => fetchAllPages((cursor) => getUndatedPhotosPage({ bunchId, cursor, signal }))
      : skipToken,
  });

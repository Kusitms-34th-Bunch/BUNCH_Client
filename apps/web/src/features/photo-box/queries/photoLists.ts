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
  do {
    const page = await request(cursor);
    // 같은 cursor를 되풀이하는 응답이면 무한 반복하지 않고 중단
    if (page.nextCursor !== null && page.nextCursor === cursor) break;
    photos.push(...page.photos);
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

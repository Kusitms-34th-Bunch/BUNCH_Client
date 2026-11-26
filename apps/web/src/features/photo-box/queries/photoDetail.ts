import { queryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { getPhotoDetail } from '../api/photos';
import { preloadPhotoRatio } from '../lib/photoRatio';
import { photoBoxKeys } from './keys';

const ORIGINAL_STALE_MS = 10 * 60 * 1000;

/** 사진 한 장의 원본 이미지 주소. 번치를 아직 모르면 요청하지 않음 */
export const photoDetailQueryOptions = (bunchId: string | undefined, photoId: string) =>
  queryOptions({
    queryKey: photoBoxKeys.photoDetail(bunchId, photoId),
    queryFn: bunchId ? ({ signal }) => getPhotoDetail(bunchId, photoId, signal) : skipToken,
    // 원본 주소는 서명 주소라 30분 뒤 만료(받은 주소는 15분 넘게 남음, stableSignedUrls). 그 전에 다시 받음(#587)
    staleTime: ORIGINAL_STALE_MS,
  });

/** 사진 상세에 들어가기 전 원본 주소와 이미지를 미리 받음(상세가 처음부터 원본 비율로 그려지게). 실패는 상세가 다시 받음 */
export const usePrefetchPhotoOriginal = () => {
  const queryClient = useQueryClient();
  return (bunchId: string, photoId: string) =>
    void queryClient.fetchQuery(photoDetailQueryOptions(bunchId, photoId)).then(
      ({ imageSrc }) => preloadPhotoRatio(imageSrc),
      () => {},
    );
};

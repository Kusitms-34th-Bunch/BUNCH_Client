import { queryOptions, skipToken } from '@tanstack/react-query';
import { getPhotoDetail } from '../api/photos';
import { photoBoxKeys } from './keys';

/** 사진 한 장의 원본 이미지 주소. 번치를 아직 모르면 요청하지 않음 */
export const photoDetailQueryOptions = (bunchId: string | undefined, photoId: string) =>
  queryOptions({
    queryKey: photoBoxKeys.photoDetail(bunchId, photoId),
    queryFn: bunchId ? ({ signal }) => getPhotoDetail(bunchId, photoId, signal) : skipToken,
    // 원본 주소는 사진이 바뀌지 않는 한 그대로라 다시 받지 않음
    staleTime: Infinity,
  });

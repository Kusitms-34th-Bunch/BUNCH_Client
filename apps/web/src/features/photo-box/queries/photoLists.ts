import { infiniteQueryOptions, skipToken } from '@tanstack/react-query';
import { getDatedPhotosPage, getUndatedPhotosPage } from '../api/photos';
import { photoBoxKeys } from './keys';

/**
 * 사진 목록이 신선하다고 보는 시간(30초). 기본 5분이면 사진함에 들어오거나 앱에 돌아와도 다른 멤버가 올리거나 지운 사진이
 * 한참 안 보이므로(명세 3.1.1: 진입·앱 복귀 때 반영) 줄이되, 사진함·상세·번들 화면을 오가며 전체 쪽을 매번 다시 받지는 않게 함
 */
export const PHOTO_LIST_STALE_TIME = 30_000;

type PhotosPage = Awaited<ReturnType<typeof getDatedPhotosPage>>;

// 같은 cursor가 다시 오면(서버 오류로 같은 쪽 반복·A→B→A 순환) 무한 반복하지 않고 거기서 끝냄
const getNextPageParam = (
  lastPage: PhotosPage,
  _pages: PhotosPage[],
  _lastParam: string | undefined,
  allParams: (string | undefined)[],
) =>
  lastPage.nextCursor !== null && !allParams.includes(lastPage.nextCursor)
    ? lastPage.nextCursor
    : undefined;

// 받은 쪽을 한 목록으로 합침(멤버 필터·날짜 묶기는 화면이 이 목록으로 함)
const flattenPages = (data: { pages: PhotosPage[] }) => data.pages.flatMap((page) => page.photos);

/**
 * 날짜를 아는 사진(최신순)을 쪽 단위로 받음. 번치를 아직 모르면 요청하지 않음
 * 화면이 한 목록으로 계산하므로 `usePhotoBox`가 남은 쪽을 이어서 받음(첫 쪽만 오면 먼저 보여 줄 수 있음)
 */
export const datedPhotosQueryOptions = (bunchId: string | undefined) =>
  infiniteQueryOptions({
    queryKey: photoBoxKeys.datedPhotos(bunchId),
    staleTime: PHOTO_LIST_STALE_TIME,
    initialPageParam: undefined as string | undefined,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getDatedPhotosPage({ bunchId, cursor: pageParam, signal })
      : skipToken,
    getNextPageParam,
    select: flattenPages,
  });

/** 날짜를 모르는 사진을 쪽 단위로 받음 */
export const undatedPhotosQueryOptions = (bunchId: string | undefined) =>
  infiniteQueryOptions({
    queryKey: photoBoxKeys.undatedPhotos(bunchId),
    staleTime: PHOTO_LIST_STALE_TIME,
    initialPageParam: undefined as string | undefined,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getUndatedPhotosPage({ bunchId, cursor: pageParam, signal })
      : skipToken,
    getNextPageParam,
    select: flattenPages,
  });

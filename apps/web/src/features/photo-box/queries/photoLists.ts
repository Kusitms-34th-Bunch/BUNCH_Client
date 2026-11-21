import { infiniteQueryOptions, skipToken } from '@tanstack/react-query';
import { persistedFirstPage } from '@/shared/query/persistence';
import { getDatedPhotosPage, getUndatedPhotosPage } from '../api/photos';
import { photoBoxKeys } from './keys';

/**
 * 사진 목록이 신선하다고 보는 시간(30초). 기본 5분이면 다른 멤버가 올리거나 지운 사진이 한참 안 보이므로 줄이되,
 * 사진 상세·번들 화면이 전체 쪽을 마운트할 때마다 다시 받지는 않게 함
 */
export const PHOTO_LIST_STALE_TIME = 30_000;

/**
 * 사진함 화면이 쓰는 신선 시간(0): 사진함에 들어오거나 앱에 돌아올 때마다 목록을 다시 받아 다른 멤버가 올리거나 지운 사진을 반영함(명세 3.1.1)
 * 받아 둔 목록이 있으면 그것을 먼저 보여 주고 뒤에서 새로 받아 바뀐 것만 반영하므로 이미 있던 사진은 기다리지 않고 보이고, 새로 올라온 사진만 조금 늦게 뜰 수 있음
 */
export const PHOTO_BOX_STALE_TIME = 0;

/**
 * 사진함에 머무는 동안 목록을 다시 받는 간격(20초)
 * 명세(3.1.1)는 진입·앱 복귀·당겨서 새로고침으로만 반영하지만, 오래 머무는 사이 다른 멤버가 지운 사진이 남아 있어 선택·삭제가 어긋나는 것을 줄이려는 운영 안전망
 * 화면이 가려지면(앱이 뒤로 가거나 다른 화면으로 이동) 멈추고, 돌아오면 진입·앱 복귀 갱신이 이어받음
 */
export const PHOTO_BOX_POLL_MS = 20_000;

type PhotoListOptions = {
  /** 목록을 신선하다고 보는 시간. 기본은 `PHOTO_LIST_STALE_TIME` */
  staleTime?: number;
  /** 화면이 보이는 동안 이 간격(ms)마다 다시 받음. 기본은 다시 받지 않음 */
  refetchInterval?: number;
};

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
export const datedPhotosQueryOptions = (
  bunchId: string | undefined,
  { staleTime = PHOTO_LIST_STALE_TIME, refetchInterval }: PhotoListOptions = {},
) =>
  infiniteQueryOptions({
    queryKey: photoBoxKeys.datedPhotos(bunchId),
    staleTime,
    // 앱을 다시 열면 지난 첫 쪽을 먼저 보이고 다시 받음
    ...persistedFirstPage,
    // 화면이 가려진 동안(백그라운드)은 기본값(refetchIntervalInBackground: false)대로 멈춤
    refetchInterval: refetchInterval ?? false,
    initialPageParam: undefined as string | undefined,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getDatedPhotosPage({ bunchId, cursor: pageParam, signal })
      : skipToken,
    getNextPageParam,
    select: flattenPages,
  });

/** 날짜를 모르는 사진을 쪽 단위로 받음 */
export const undatedPhotosQueryOptions = (
  bunchId: string | undefined,
  { staleTime = PHOTO_LIST_STALE_TIME, refetchInterval }: PhotoListOptions = {},
) =>
  infiniteQueryOptions({
    queryKey: photoBoxKeys.undatedPhotos(bunchId),
    staleTime,
    // 앱을 다시 열면 지난 첫 쪽을 먼저 보이고 다시 받음
    ...persistedFirstPage,
    refetchInterval: refetchInterval ?? false,
    initialPageParam: undefined as string | undefined,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getUndatedPhotosPage({ bunchId, cursor: pageParam, signal })
      : skipToken,
    getNextPageParam,
    select: flattenPages,
  });

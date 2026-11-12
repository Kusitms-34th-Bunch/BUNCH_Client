import { useInfiniteQuery, useQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { PhotoBoxPreview } from '../lib/preview';
import type { PhotoBoxActions, PhotoBoxData, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { saveToAlbum } from '../api/albumSave';
import { applyTakenDate } from '../lib/photoActions';
import {
  datedPhotosQueryOptions,
  PHOTO_BOX_STALE_TIME,
  undatedPhotosQueryOptions,
} from '../queries/photoLists';
import { useDeletePhotosMutation } from '../queries/photos';

// 목 날짜 변경이 끝나기까지의 시간(시트의 「저장 중」 상태가 보이도록)
const MOCK_CHANGE_DATE_DELAY_MS = 500;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
  /** 오류 화면의 「다시 시도」 */
  retry: () => void;
  /** 첫 쪽 뒤의 쪽을 받다 실패했을 때 그 쪽부터 다시 받음 */
  loadMore: () => void;
  /** 당겨서 새로고침: 프로필·멤버·사진 목록을 모두 다시 받고, 하나라도 실패하면 거부함 */
  refresh: () => Promise<void>;
  /**
   * 이어 받기가 실패한 시각(없으면 0). 실패할 때마다 값이 바뀌어, 재시도가 빨라 렌더가 묶여도 실패를 한 번씩 알아챌 수 있음
   * (`more`만 보면 error→loading→error가 한 렌더로 묶여 재실패가 보이지 않을 수 있음)
   */
  moreErrorAt: number;
  /** 이미 받은 목록은 있는데 최신 목록을 다시 받지 못한 상태(삭제 뒤 재조회 실패 등), 화면이 안내함 */
  stale: boolean;
};

type DateChange = { ids: ReadonlySet<string>; date: Date };

type UsePhotoBoxOptions = {
  /**
   * true면 첫 쪽(100장)이 오는 대로 보여 주고 나머지는 이어서 받음(`data.more`로 상태를 알림). 사진함 화면용
   * 기본(false)은 마지막 쪽까지 받은 뒤에만 준비 상태가 됨. 번들 화면은 사진 id로 전체 목록에서 찾으므로 이 값을 씀
   */
  progressive?: boolean;
};

type PhotoPagesQuery = Pick<
  UseInfiniteQueryResult<unknown>,
  | 'hasNextPage'
  | 'isFetching'
  | 'isFetchNextPageError'
  | 'isError'
  | 'dataUpdatedAt'
  | 'fetchNextPage'
  | 'refetch'
>;

// 남은 쪽을 한 쪽씩 이어서 받음. 이어 받다 실패하면 멈추고(무한 재시도 방지) 사용자가 다시 시도할 때 이어 감
function useLoadRemainingPages({
  hasNextPage,
  isFetching,
  isFetchNextPageError,
  dataUpdatedAt,
  fetchNextPage,
}: PhotoPagesQuery) {
  // dataUpdatedAt: 쪽이 하나 도착해도 나머지 값은 그대로(받는 동안 렌더가 묶임)일 수 있어, 도착할 때마다 다음 쪽을 이어 받게 함
  useEffect(() => {
    // cancelRefetch: false — 같은 목록을 쓰는 hook이 동시에 마운트돼도 받는 중인 요청을 취소하고 다시 보내지 않음
    if (hasNextPage && !isFetching && !isFetchNextPageError) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetching, isFetchNextPageError, dataUpdatedAt, fetchNextPage]);
}

// 이어 받다 실패했으면 그 쪽부터, 첫 쪽이 실패했으면 처음부터 다시 받음(실패하지 않았으면 아무것도 안 함)
const retryPhotos = (query: PhotoPagesQuery) => {
  // 이미 받는 중이면 건드리지 않음(다시 부르면 받는 중인 요청을 취소하고 처음부터 보냄)
  if (query.isFetching) return;
  if (query.isFetchNextPageError) void query.fetchNextPage();
  else if (query.isError) void query.refetch();
};

/**
 * 사진함 화면 상태와 동작의 호출 지점: 내 프로필(기본 번치)·멤버·사진 목록 query를 화면 상태로 합치고 삭제는 mutation으로 보냄
 * 앨범 저장은 상세 API로 받은 원본 주소를 쉘에 넘겨 기기에 저장하고, 날짜 변경은 서버 반영 전이라 이 hook 인스턴스(화면) 안에서만 목록에 덮어 보임(새로고침하거나 사진함·상세 사이를 이동하면 원래 날짜)
 * `preview`는 상태 미리보기용으로 API 연결이 끝나면 함께 없앰
 */
export function usePhotoBox(
  preview?: PhotoBoxPreview,
  { progressive = false }: UsePhotoBoxOptions = {},
): UsePhotoBoxResult {
  const {
    data: profile,
    isError: profileError,
    isRefetchError: profileRefetchError,
    refetch: refetchProfile,
  } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const {
    data: members,
    isError: membersError,
    isRefetchError: membersRefetchError,
    refetch: refetchMembers,
  } = useQuery(bunchMembersQueryOptions(bunchId));
  // 사진함 화면(progressive)은 들어올 때마다 목록을 다시 받고, 번들·상세 화면은 30초 안에는 받아 둔 목록을 그대로 씀
  const listOptions = progressive ? { staleTime: PHOTO_BOX_STALE_TIME } : undefined;
  const datedQuery = useInfiniteQuery(datedPhotosQueryOptions(bunchId, listOptions));
  const undatedQuery = useInfiniteQuery(undatedPhotosQueryOptions(bunchId, listOptions));
  const { data: dated, isError: datedError } = datedQuery;
  const { data: undated, isError: undatedError } = undatedQuery;
  useLoadRemainingPages(datedQuery);
  useLoadRemainingPages(undatedQuery);
  const hasMore = datedQuery.hasNextPage || undatedQuery.hasNextPage;
  // 첫 쪽 뒤의 쪽을 받다 실패한 상태(이미 받은 사진은 있음). 첫 쪽·재조회 실패와 구분
  // (재시도 중에는 TanStack이 오류 상태를 성공할 때까지 유지하므로 받는 중이면 실패로 보지 않고 다시 loading으로 봄)
  const moreFailed =
    (datedQuery.isFetchNextPageError && !datedQuery.isFetchingNextPage) ||
    (undatedQuery.isFetchNextPageError && !undatedQuery.isFetchingNextPage);
  const [dateChanges, setDateChanges] = useState<readonly DateChange[]>([]);

  const removeMutation = useDeletePhotosMutation(bunchId);

  const data = useMemo<PhotoBoxData | null>(() => {
    const bunch = profile?.bunch;
    if (!profile || !bunch || !members || !dated || !undated) return null;
    // 이어서 받는 화면이 아니면 마지막 쪽까지 받은 뒤에만 보여 줌(번들 화면은 사진 id로 전체 목록을 찾음)
    if (!progressive && hasMore) return null;
    const me = members.find((member) => member.id === profile.memberId);
    const photos = dateChanges.reduce<readonly PhotoBoxPhoto[]>(
      (current, change) => applyTakenDate(current, change.ids, change.date),
      // 두 요청 사이에 촬영 날짜가 바뀌면 같은 사진이 양쪽에 있을 수 있어 id로 한 번만 남김(날짜 있는 쪽 우선)
      [...new Map([...undated, ...dated].map((photo) => [photo.id, photo])).values()],
    );
    let more: PhotoBoxData['more'];
    if (moreFailed) more = 'error';
    else if (hasMore) more = 'loading';
    return {
      bunch,
      viewer: { memberId: profile.memberId, isAdmin: me !== undefined && me.role !== 'MEMBER' },
      members,
      photos,
      ...(more ? { more } : {}),
    };
  }, [profile, members, dated, undated, dateChanges, progressive, hasMore, moreFailed]);

  // 이미 받은 목록이 있으면 재조회가 실패해도 화면을 유지(삭제 뒤 재조회 실패로 정상 화면이 오류로 덮이지 않게)
  // 이어서 받는 화면이 아니면 중간 쪽 실패도 오류(전체 목록이 있어야 하므로)
  const failed =
    (profileError && !profile) ||
    (membersError && !members) ||
    (datedError && !dated) ||
    (undatedError && !undated) ||
    (!progressive && moreFailed);
  // 이어 받다 실패한 것은 화면 아래에서 알리므로 목록 재조회 실패 안내(stale)에서 뺌
  const stale =
    profileRefetchError ||
    membersRefetchError ||
    (datedQuery.isRefetchError && !datedQuery.isFetchNextPageError) ||
    (undatedQuery.isRefetchError && !undatedQuery.isFetchNextPageError);
  // 다시 시도: 실패한 요청만 다시 보냄(이어 받다 실패했으면 그 쪽부터)
  const retry = () => {
    if (profileError) void refetchProfile();
    if (membersError) void refetchMembers();
    retryPhotos(datedQuery);
    retryPhotos(undatedQuery);
  };
  const moreErrorAt = moreFailed
    ? Math.max(datedQuery.errorUpdatedAt, undatedQuery.errorUpdatedAt)
    : 0;
  const loadMore = () => {
    retryPhotos(datedQuery);
    retryPhotos(undatedQuery);
  };
  const refresh = async () => {
    // 번치를 모르면(프로필 전·번치 없음) 목록 요청을 보낼 수 없어 프로필부터 다시 받음
    const throwOnError = { throwOnError: true };
    const results = await Promise.allSettled([
      refetchProfile(throwOnError),
      ...(bunchId
        ? [
            refetchMembers(throwOnError),
            datedQuery.refetch(throwOnError),
            undatedQuery.refetch(throwOnError),
          ]
        : []),
    ]);
    // 모두 끝난 뒤(일부만 끝났을 때 풀리지 않게) 하나라도 실패했으면 거부해 새로고침 실패로 알림
    if (results.some((result) => result.status === 'rejected'))
      throw new Error('photo box refresh failed');
  };
  const state = useMemo<PhotoBoxState>(() => {
    if (preview === 'loading') return { kind: 'loading' };
    if (preview === 'error' || failed) return { kind: 'error' };
    if (preview === 'no-bunch' || (profile && !profile.bunch)) return { kind: 'no-bunch' };
    if (!data) return { kind: 'loading' };
    if (preview === 'empty') return { kind: 'ready', data: { ...data, photos: [] } };
    return { kind: 'ready', data };
  }, [preview, failed, profile, data]);

  const actions: PhotoBoxActions = {
    // 번치를 모르면(화면이 준비되기 전) 저장할 사진 주소도 받을 수 없어 전부 실패로 돌려줌
    savePhotos: (ids) =>
      bunchId ? saveToAlbum(bunchId, ids) : Promise.resolve({ savedIds: [], failedIds: ids }),
    changePhotoDates: async (ids, date) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_CHANGE_DATE_DELAY_MS));
      setDateChanges((current) => [...current, { ids: new Set(ids), date }]);
    },
    deletePhotos: async (ids) => {
      const { deletedCount } = await removeMutation.mutateAsync(ids);
      return { removedCount: deletedCount };
    },
  };

  return { state, actions, retry, loadMore, refresh, moreErrorAt, stale };
}

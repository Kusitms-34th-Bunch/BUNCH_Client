import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { PhotoBoxPreview } from '../lib/preview';
import type { PhotoBoxActions, PhotoBoxData, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { applyTakenDate } from '../lib/photoActions';
import { datedPhotosQueryOptions, undatedPhotosQueryOptions } from '../queries/photoLists';
import { useDeletePhotosMutation } from '../queries/photos';

// 목 저장이 끝나기까지의 시간(화면 전체 로딩이 보이도록)
const MOCK_SAVE_DELAY_MS = 800;
// 목 날짜 변경이 끝나기까지의 시간(시트의 「저장 중」 상태가 보이도록)
const MOCK_CHANGE_DATE_DELAY_MS = 500;

type UsePhotoBoxResult = {
  state: PhotoBoxState;
  actions: PhotoBoxActions;
  /** 오류 화면의 「다시 시도」 */
  retry: () => void;
  /** 이미 받은 목록은 있는데 최신 목록을 다시 받지 못한 상태(삭제 뒤 재조회 실패 등), 화면이 안내함 */
  stale: boolean;
};

type DateChange = { ids: ReadonlySet<string>; date: Date };

/**
 * 사진함 화면 상태와 동작의 호출 지점: 내 프로필(기본 번치)·멤버·사진 목록 query를 화면 상태로 합치고 삭제는 mutation으로 보냄
 * 앨범 저장은 기기 동작이라 목, 날짜 변경은 서버 반영 전이라 이 hook 인스턴스(화면) 안에서만 목록에 덮어 보임(새로고침하거나 사진함·상세 사이를 이동하면 원래 날짜)
 * `preview`는 상태 미리보기용으로 API 연결이 끝나면 함께 없앰
 */
export function usePhotoBox(preview?: PhotoBoxPreview): UsePhotoBoxResult {
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
  } = useQuery(bunchMembersQueryOptions(bunchId, profile?.bunch?.characterType));
  const {
    data: dated,
    isError: datedError,
    isRefetchError: datedRefetchError,
    refetch: refetchDated,
  } = useQuery(datedPhotosQueryOptions(bunchId));
  const {
    data: undated,
    isError: undatedError,
    isRefetchError: undatedRefetchError,
    refetch: refetchUndated,
  } = useQuery(undatedPhotosQueryOptions(bunchId));
  const [dateChanges, setDateChanges] = useState<readonly DateChange[]>([]);

  const removeMutation = useDeletePhotosMutation(bunchId);

  const data = useMemo<PhotoBoxData | null>(() => {
    const bunch = profile?.bunch;
    if (!profile || !bunch || !members || !dated || !undated) return null;
    const me = members.find((member) => member.id === profile.memberId);
    const photos = dateChanges.reduce<readonly PhotoBoxPhoto[]>(
      (current, change) => applyTakenDate(current, change.ids, change.date),
      // 두 요청 사이에 촬영 날짜가 바뀌면 같은 사진이 양쪽에 있을 수 있어 id로 한 번만 남김(날짜 있는 쪽 우선)
      [...new Map([...undated, ...dated].map((photo) => [photo.id, photo])).values()],
    );
    return {
      bunch,
      viewer: { memberId: profile.memberId, isAdmin: me !== undefined && me.role !== 'MEMBER' },
      members,
      photos,
    };
  }, [profile, members, dated, undated, dateChanges]);

  // 이미 받은 목록이 있으면 재조회가 실패해도 화면을 유지(삭제 뒤 재조회 실패로 정상 화면이 오류로 덮이지 않게)
  const failed =
    (profileError && !profile) ||
    (membersError && !members) ||
    (datedError && !dated) ||
    (undatedError && !undated);
  // 다시 시도: 실패한 요청만 다시 보냄
  const stale =
    profileRefetchError || membersRefetchError || datedRefetchError || undatedRefetchError;
  const retry = () => {
    if (profileError) void refetchProfile();
    if (membersError) void refetchMembers();
    if (datedError) void refetchDated();
    if (undatedError) void refetchUndated();
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
    savePhotos: async (ids) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_SAVE_DELAY_MS));
      return { savedIds: ids, failedIds: [] };
    },
    changePhotoDates: async (ids, date) => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_CHANGE_DATE_DELAY_MS));
      setDateChanges((current) => [...current, { ids: new Set(ids), date }]);
    },
    deletePhotos: async (ids) => {
      const { deletedCount } = await removeMutation.mutateAsync(ids);
      return { removedCount: deletedCount };
    },
  };

  return { state, actions, retry, stale };
}

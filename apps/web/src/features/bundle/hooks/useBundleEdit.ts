'use client';
// 크기 유지: 세 query의 로딩·오류·권한 판단과 편집 값·저장이 같은 서버 기준(base)과 편집 값을 함께 씀

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { apiErrorCode } from '@/shared/api/errorStatus';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { LocationOp } from '../lib/locationOps';
import type { Draft, DraftViewer, PlaceResult } from '../lib/types';
import type { DraftActions } from './useDraft';
import type { PresenceCommands } from './usePresenceSender';
import { searchPlaces as searchPlacesApi } from '../api/places';
import { BUNDLE_MESSAGES, MAX_PHOTOS, TITLE_MAX_LENGTH } from '../constants/messages';
import {
  applyOp,
  type EditValues,
  type Overrides,
  reconcileOverrides,
  sameIds,
  sameLocations,
  toEditPhotos,
} from '../lib/bundleEdit';
import { toDraft } from '../lib/draftMapping';
import { moveLocation } from '../lib/locations';
import { movePhoto, removePhoto } from '../lib/photos';
import { countTitleGraphemes } from '../lib/title';
import { bundleEditQueryOptions, useEditPublishedBundleMutation } from '../queries/bundleEdit';

/** 저장 결과: 화면이 안내와 이동을 정함 */
export type EditSaveOutcome =
  | 'saved'
  /** 메인 관리자가 아니게 됨(AUTH_002) */
  | 'forbidden'
  /** 그사이 삭제됐거나 초안으로 돌아감(RESOURCE_001·BUNDLE_002) */
  | 'missing'
  /** 편집하는 사이 서버 값이 바뀜(BUNDLE_003): 최신 값을 받아 두었으니 다시 저장하면 됨 */
  | 'conflict'
  /** 제목에 금칙어가 있어 서버가 거부함(COMMON_003): 제목 입력란 아래에 안내하고 머묾(기능명세 6.2.12 예외) */
  | 'prohibited'
  | 'failed'
  /** 저장할 수 없는 상태(바뀐 내용 없음·제목이 비었음·저장 중)라 보내지 않음 */
  | 'skipped';

export type BundleEditState =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  /** 없는 번들·삭제됨 */
  | { kind: 'missing' }
  /** 아직 발행되지 않은 초안(작성 화면에서 고침) */
  | { kind: 'draft' }
  /** 이 번치의 메인 관리자가 아님 */
  | { kind: 'forbidden' }
  | {
      kind: 'ready';
      draft: Draft;
      /** 편집하는 사람(메인 관리자) */
      viewer: DraftViewer;
      /** 서버에서 받은 값과 달라진 내용이 있는지(「저장」 활성과 나가기 확인의 기준) */
      dirty: boolean;
      /** 저장할 수 있는지: 바뀐 내용이 있고 제목이 비어 있지 않음 */
      canSave: boolean;
      saving: boolean;
    };

export type BundleEditActions = Pick<
  DraftActions,
  | 'setTitle'
  | 'setDate'
  | 'removePhoto'
  | 'movePhoto'
  | 'replacePhotos'
  | 'addLocation'
  | 'replaceLocation'
  | 'removeLocation'
  | 'moveLocation'
  | 'searchPlaces'
  | 'presence'
  | 'setPhotoDragging'
> & {
  /** 바뀐 내용을 한 번에 서버에 저장 */
  save: () => Promise<EditSaveOutcome>;
};

// 수정 화면은 공동 편집이 아니라 다른 멤버에게 작업 중임을 알리지 않음
const NO_PRESENCE: PresenceCommands = {
  type: () => undefined,
  blur: () => undefined,
  begin: () => undefined,
  end: () => undefined,
};

/**
 * 발행 번들 수정 화면의 상태와 동작(기능 명세 6.2.12): 메인 관리자만, 저장 전까지 서버에 반영하지 않고 「저장」 한 번으로 최종 내용을 보냄
 * 제목·날짜·사진(추가·삭제·순서)·위치(최대 3개)만 고치고 코멘트·참여 멤버·픽은 고칠 수 없음(받은 값 그대로 보여 줌)
 * 서버 값은 화면을 열 때 한 번 받아 두고 편집 중에는 다시 받지 않음(저장하면 서버가 돌려준 값이 새 기준이 됨)
 */
export function useBundleEdit(
  bunchId: string,
  bundleId: string,
): {
  state: BundleEditState;
  actions: BundleEditActions;
} {
  const profile = useQuery(myProfileQueryOptions());
  const myBunchId = profile.data?.bunch?.id;
  const members = useQuery(bunchMembersQueryOptions(myBunchId));
  const detailQuery = useQuery(bundleEditQueryOptions(bunchId, bundleId));
  const detail = detailQuery.data;
  const save = useEditPublishedBundleMutation(bunchId);
  const [overrides, setOverrides] = useState<Overrides>({});
  // 저장 요청이 끝난 뒤 충돌 정리(최신 값을 받아 편집 값을 맞춤)가 끝날 때까지 입력과 재저장을 막음
  const [resolving, setResolving] = useState(false);
  // 저장 때 서버가 금칙어로 거부한 제목(앞뒤 공백을 지운 값). 그 제목 그대로인 동안만 안내하고, 고치면 지움
  const [prohibitedTitle, setProhibitedTitle] = useState<string | null>(null);
  // 이 화면에서 더한 위치 줄의 번호(줄 id가 겹치지 않게)
  const nextNo = useRef(0);

  const bunchMembers = members.data;
  const memberId = profile.data?.memberId;
  const me = bunchMembers?.find((member) => member.id === memberId);

  const base = useMemo(
    () =>
      detail && bunchMembers
        ? toDraft({ detail, bunchMembers, locations: detail.locations })
        : undefined,
    [detail, bunchMembers],
  );

  const values: EditValues | undefined = base && {
    title: overrides.title ?? base.title,
    date: overrides.date === undefined ? base.date : overrides.date,
    photos: overrides.photos ?? base.photos,
    locations: overrides.locations ?? base.locations,
  };

  const dirty =
    base !== undefined &&
    values !== undefined &&
    (values.title.trim() !== base.title.trim() ||
      values.date !== base.date ||
      !sameIds(values.photos, base.photos) ||
      !sameLocations(values.locations, base.locations));
  const titleTrimmed = values?.title.trim() ?? '';
  const titleValid = titleTrimmed !== '' && countTitleGraphemes(titleTrimmed) <= TITLE_MAX_LENGTH;
  const saving = save.isPending || resolving;
  const canSave = dirty && titleValid && !saving;

  const change = (patch: Overrides) => setOverrides((current) => ({ ...current, ...patch }));
  const currentPhotos = () => values?.photos ?? [];
  const currentLocations = () => values?.locations ?? [];
  const addOp = (change_: (_no: number) => LocationOp) => {
    nextNo.current += 1;
    const op = change_(nextNo.current);
    setOverrides((current) => ({
      ...current,
      locations: applyOp(current.locations ?? base?.locations ?? [], op),
    }));
  };

  const actions: BundleEditActions = {
    setTitle: (title) => change({ title }),
    setDate: (date) => change({ date }),
    removePhoto: (photoId) => {
      // 마지막 1장은 빼지 않음(화면이 먼저 「사진을 삭제할 수 없어요」로 막음)
      if (currentPhotos().length <= 1) return false;
      change({ photos: removePhoto(currentPhotos(), photoId) });
      return true;
    },
    movePhoto: (photoId, toIndex) =>
      change({ photos: movePhoto(currentPhotos(), photoId, toIndex) }),
    replacePhotos: (photos, options) => {
      // 수정 화면은 혼자 고치는 구성이라 갤러리 가져오기를 남은 자리(20장)까지만 붙이고 담긴 장수를 셈(기능명세서 4.3.14)
      if (options?.partialAdd) {
        const currentIds = new Set(currentPhotos().map((photo) => photo.id));
        const kept = photos.slice(0, MAX_PHOTOS);
        const added = kept.filter((photo) => !currentIds.has(photo.id)).length;
        if (options.requested !== undefined && added < options.requested) {
          toast(BUNDLE_MESSAGES.photosAddedUpTo(added));
        }
        if (added > 0) change({ photos: kept });
        return true;
      }
      change({ photos });
      return true;
    },
    addLocation: (place: PlaceResult) => addOp((no) => ({ no, kind: 'add', place })),
    replaceLocation: (targetId, place) => addOp((no) => ({ no, kind: 'replace', targetId, place })),
    removeLocation: (targetId) => addOp((no) => ({ no, kind: 'remove', targetId })),
    moveLocation: (targetId, toIndex) =>
      change({ locations: moveLocation(currentLocations(), targetId, toIndex) }),
    searchPlaces: searchPlacesApi,
    presence: NO_PRESENCE,
    setPhotoDragging: () => undefined,
    save: async () => {
      if (!detail || !values || !canSave) return 'skipped';
      const photos = toEditPhotos(values.photos, new Set(base?.photos.map((photo) => photo.id)));
      // 보낼 id가 없는 사진이 있으면 조용히 빼지 않고 저장하지 않음
      if (!photos) return 'failed';
      setResolving(true);
      try {
        await save.mutateAsync({
          bundleId,
          expectedRevision: detail.revision,
          title: titleTrimmed,
          date: values.date,
          photos,
          locations: values.locations,
        });
        setOverrides({});
        return 'saved';
      } catch (error) {
        const code = apiErrorCode(error);
        // 이 경로에서 금칙어를 검사하는 칸은 제목뿐이라 칸 이름을 읽지 못해도 제목 거부로 봄
        if (prohibitedFieldsOf(error) !== null) {
          setProhibitedTitle(titleTrimmed);
          return 'prohibited';
        }
        if (code === 'AUTH_002') return 'forbidden';
        if (code === 'RESOURCE_001' || code === 'BUNDLE_002') return 'missing';
        if (code === 'BUNDLE_003') {
          // 편집하는 사이 서버 값이 바뀜: 최신 값을 받아 두고, 서버에서 바뀐 필드의 내 편집은 버린 채 다시 저장하게 함
          const refreshed = (await detailQuery.refetch()).data;
          if (base && refreshed && bunchMembers) {
            const latest = toDraft({
              detail: refreshed,
              bunchMembers,
              locations: refreshed.locations,
            });
            setOverrides((current) => reconcileOverrides(current, base, latest));
          }
          return 'conflict';
        }
        return 'failed';
      } finally {
        setResolving(false);
      }
    },
  };

  let state: BundleEditState;
  // 초안과 발행본은 상세 캐시를 같이 쓰므로, 캐시에 남은 옛 초안 값으로 작성 화면에 보내지 않고 연 뒤 첫 응답을 기다림
  if (detail?.status === 'DRAFT' && detailQuery.isFetchedAfterMount && !detailQuery.isError) {
    state = { kind: 'draft' };
  } else if (
    profile.isError ||
    members.isError ||
    // 재조회가 실패했는데 남은 값이 옛 초안이면 그 값으로 판단하지 않고 오류로 안내함
    (detailQuery.isError && (detail === undefined || detail.status === 'DRAFT')) ||
    // 연결이 없어 첫 조회가 멈춘 채로는 끝나지 않으므로 로딩에 머물지 않고 안내함(연결이 돌아오면 이어서 열림)
    (detailQuery.fetchStatus === 'paused' && !detailQuery.isFetchedAfterMount)
  ) {
    const code = apiErrorCode(detailQuery.error);
    if (!profile.isError && !members.isError && code === 'RESOURCE_001')
      state = { kind: 'missing' };
    else if (!profile.isError && !members.isError && code === 'AUTH_002') {
      state = { kind: 'forbidden' };
    } else {
      state = {
        kind: 'error',
        retry: () => {
          if (profile.isError) void profile.refetch();
          if (members.isError) void members.refetch();
          if (detailQuery.isError || detailQuery.fetchStatus === 'paused')
            void detailQuery.refetch();
        },
      };
    }
  } else if (
    !detail ||
    !base ||
    !values ||
    !bunchMembers ||
    !profile.data ||
    // 캐시에 남은 옛 값으로 먼저 열어 편집 기준과 expectedRevision이 중간에 바뀌지 않게, 연 뒤 첫 응답(성공·실패)을 기다림
    !detailQuery.isFetchedAfterMount
  ) {
    state = { kind: 'loading' };
  } else if (myBunchId !== bunchId || me?.role !== 'OWNER') {
    // 우리 번치의 메인 관리자만(역할이 바뀌었으면 서버가 저장도 거절함)
    state = { kind: 'forbidden' };
  } else {
    state = {
      kind: 'ready',
      draft: {
        ...base,
        title: values.title,
        date: values.date,
        photos: values.photos,
        locations: values.locations,
        // 편집 중 표시는 이 화면에서 쓰지 않음. 픽은 사진 삭제 확인(「픽한 사진이에요」)에만 쓰고 화면에는 나타나지 않음
        editing: {},
        viewingMemberIds: [],
        // 발행본은 서버가 금칙어를 소급 검사하지 않아, 저장 때 거부된 제목만 안내(코멘트는 고칠 수 없어 대상 아님)
        prohibited: {
          title: prohibitedTitle !== null && titleTrimmed === prohibitedTitle,
          commentMemberIds: [],
        },
      },
      viewer: { memberId: me.id, bunchRole: 'owner' },
      dirty,
      canSave,
      saving,
    };
  }

  return { state, actions };
}

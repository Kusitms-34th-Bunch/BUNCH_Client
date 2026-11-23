'use client';
// 크기 유지: 저장·사진·위치·재조회 hook 결과를 화면 상태와 연결 가드 동작으로 합치고, 발행이 그 모두를 차례로 기다림

import { toast } from '@app/design-system';
import { useIsMutating, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type {
  Draft,
  DraftLocation,
  DraftMember,
  DraftPhoto,
  DraftViewer,
  DraftVisibility,
  PlaceResult,
  SaveStatus,
} from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import { errorCodeOf } from '../api/bundleErrors';
import { searchPlaces as searchPlacesApi } from '../api/places';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { pickNewerDetail, toDraft, toDraftMember, withPendingComment } from '../lib/draftMapping';
import { classifyPublishError } from '../lib/publish';
import { ensureTitleCrdt } from '../lib/titleCrdt';
import {
  bundleQueryOptions,
  useAddParticipantMutation,
  useChangePhotosMutation,
  useMovePhotoMutation,
  usePublishBundleMutation,
  useRemoveParticipantMutation,
  useSaveCommentMutation,
  useSaveDateMutation,
  useMergeTitleMutation,
} from '../queries/bundles';
import { bundleMutationKeys } from '../queries/keys';
import { useBundleLocations } from './useBundleLocations';
import { useBundleRealtime } from './useBundleRealtime';
import { isEmptyPending, useDraftAutosave } from './useDraftAutosave';
import { type ReplacePhotosOptions, useDraftPhotoQueue } from './useDraftPhotoQueue';
import { useHeldEventResync } from './useHeldEventResync';
import { useOnlineStatus } from './useOnlineStatus';
import { usePresence } from './usePresence';
import { type PresenceCommands, usePresenceSender } from './usePresenceSender';
import { useTitleCrdt } from './useTitleCrdt';

export type { ReplacePhotosOptions } from './useDraftPhotoQueue';

// 위치가 없을 때 쓰는 고정된 빈 목록(렌더마다 새 배열이 되어 draft를 다시 만들지 않게 함)
const NO_LOCATIONS: readonly DraftLocation[] = [];

// 입력이 멈추고 이만큼 지나면 저장(기능 spec 4.3.14의 「입력이 1초 멈출 때 저장」), 날짜는 고르는 즉시 저장하고 공개 범위는 발행 요청으로만 보냄
const SAVE_DELAY_MS = 1000;

export type DraftState =
  /** 삭제됐거나 없는 초안(deleted), 다른 멤버가 업로드한 초안(published) */
  | { kind: 'missing'; reason: 'deleted' | 'published'; publisherNickname?: string | undefined }
  | { kind: 'loading' }
  /** 오류 화면의 「다시 시도」: 실패한 요청만 다시 보냄 */
  | { kind: 'error'; retry: () => void }
  | {
      kind: 'ready';
      draft: Draft;
      viewer: DraftViewer;
      /** 번치 멤버 전체(참여하지 않은 멤버 포함) */
      bunchMembers: readonly DraftMember[];
      saveStatus: SaveStatus;
      /** 실시간 연결: 끊겨 편집을 막아야 하면 down, 「재시도」는 retry */
      realtime: { down: boolean; retry: () => void };
      /** 제목 문서를 불러와 입력할 수 있는지(불러오는 동안 제목 입력란은 읽기 전용) */
      titleReady: boolean;
      /** 제목 문서를 불러오지 못함: 연결 끊김과 같이 다뤄 배너를 보이고, 「재시도」(`retryTitle`)로 다시 불러옴 */
      titleFailed: boolean;
      retryTitle: () => void;
    };

/** 발행 시도 결과(화면은 성공일 때만 이동하고 나머지는 안내가 이미 나감) */
export type PublishOutcome = 'published' | 'blocked' | 'failed';

export type DraftActions = {
  setTitle: (_title: string) => void;
  /** 한글 조합 같은 입력 중에는 원격 제목 변경을 입력이 끝난 뒤 반영하도록 알림 */
  setTitleComposing: (_composing: boolean) => void;
  /** 입력·작업 중임을 다른 멤버에게 알림(제목·코멘트 입력, 날짜·사진 작업). 잠그지 않는 표시 */
  presence: PresenceCommands;
  setComment: (_memberId: string, _text: string) => void;
  /** 제목·코멘트 입력란을 벗어날 때: 입력이 1초 멈추기를 기다리지 않고 저장하지 못한 입력을 바로 저장(기능 spec 4.3.14) */
  saveNow: () => void;
  /** 공개 범위를 고름(서버에는 업로드 요청으로만 보냄). null은 고른 값을 버림(공개 범위 화면에서 뒤로 갈 때, 기능 spec 4.3.9) */
  setVisibility: (_visibility: DraftVisibility | null) => void;
  addLocation: (_place: PlaceResult) => void;
  /** 위치 줄을 눌러 다른 장소로 바꿈(줄 id와 자리는 그대로) */
  replaceLocation: (_locationId: string, _place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  /** 위치를 다른 자리로 옮김(햄버거를 잡고 끌어 순서 바꾸기, 자리는 0부터) */
  moveLocation: (_locationId: string, _toIndex: number) => void;
  setDate: (_date: string | null) => void;
  /** 번치 멤버를 참여 멤버 맨 아래에 더함(이미 참여 중이거나 번치 멤버가 아니면 무시). 연결이 끊겨 막히면 false(성공 안내를 띄우지 않음) */
  addMember: (_memberId: string) => boolean;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제). 연결이 끊겨 막히면 false */
  removeMember: (_memberId: string) => boolean;
  /** 사진을 번들에서 뺌(1장이면 무시). 서버 반영은 후속이라 이 화면에서만 바뀜. 연결이 끊겨 막히면 false */
  removePhoto: (_photoId: string) => boolean;
  /** 사진을 다른 자리(0부터)로 옮김. 서버 반영은 후속이라 이 화면에서만 바뀜 */
  movePhoto: (_photoId: string, _toIndex: number) => void;
  /**
   * 사진을 끌기 시작하거나 놓았을 때: 끄는 동안 다른 멤버의 사진 변경 이벤트는 미뤘다가 놓은 뒤 반영(기능 spec 4.3.6)
   * 시작할 때 끌기 시작한 사진의 id를 주면, 놓은 뒤 그 사진이 다른 멤버에게 지워졌을 때(자리를 바꾸지 않고 놓은 경우 포함) 안내함
   */
  setPhotoDragging: (_dragging: boolean, _photoId?: string) => void;
  /**
   * 사진 추가 화면에서 적용한 결과로 사진 목록 전체를 바꿈. 연결이 끊겨 막히면 false
   * `partialAdd`는 추가만 할 때 정원(20장)이 남은 자리까지만 담고, 덜 담겼으면 담긴 장수를 안내함(갤러리에서 가져오기, 기능명세서 4.3.14)
   */
  replacePhotos: (_photos: readonly DraftPhoto[], _options?: ReplacePhotosOptions) => boolean;
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
  /** 저장하지 못한 입력을 먼저 저장한 뒤 발행 */
  publish: () => Promise<PublishOutcome>;
};

// 연결 가드를 입히기 전의 동작: 결과를 알려 주는 동작도 여기서는 반환값이 없음
type RawActions = Omit<
  DraftActions,
  'addMember' | 'removeMember' | 'removePhoto' | 'replacePhotos'
> & {
  addMember: (_memberId: string) => void;
  removeMember: (_memberId: string) => void;
  removePhoto: (_photoId: string) => void;
  replacePhotos: (_photos: readonly DraftPhoto[], _options?: ReplacePhotosOptions) => void;
};

const toDraftVisibility = (value: 'PUBLIC' | 'PRIVATE' | null): DraftVisibility | null =>
  value === null ? null : value === 'PUBLIC' ? 'public' : 'members';

/**
 * 초안 상태와 동작: 내 프로필·번치 멤버·번들 상세 query를 화면의 `Draft`로 합치고, 입력은 바로 화면에 반영한 뒤
 * 멈추면 서버에 저장(`useDraftAutosave`), 사진 구성·순서 변경은 순서대로 하나씩 보냄(`useDraftPhotoQueue`)
 * 위치는 `useBundleLocations`, 내 요청 중에 보류한 실시간 이벤트의 재조회는 `useHeldEventResync`가 맡음
 */
export function useDraft(draftId: string | undefined): {
  state: DraftState;
  actions: DraftActions;
} {
  // 서버 번들 ID는 숫자라 숫자로 바꿀 수 없는 주소는 없는 초안으로 처리
  const bundleId = draftId !== undefined && toWireId(draftId) !== undefined ? draftId : undefined;
  const {
    data: profile,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const {
    data: bunchMembers,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery(bunchMembersQueryOptions(bunchId));
  const {
    data: detail,
    error: detailError,
    isError: detailIsError,
    refetch: refetchDetail,
  } = useQuery(bundleQueryOptions(bunchId, bundleId));

  const saveTitle = useMergeTitleMutation(bunchId, bundleId);
  const titleCrdt = useTitleCrdt(detail);
  // 저장 루프가 최신 문서를 읽도록 ref에 둠(렌더 밖에서만 읽음)
  const titleCrdtRef = useRef(titleCrdt);
  useEffect(() => {
    titleCrdtRef.current = titleCrdt;
  });
  const saveDate = useSaveDateMutation(bunchId, bundleId);
  const saveComment = useSaveCommentMutation(bunchId, bundleId);
  const changePhotos = useChangePhotosMutation(bunchId, bundleId);
  const movePhotoMutation = useMovePhotoMutation(bunchId, bundleId);
  const addParticipant = useAddParticipantMutation(bunchId, bundleId);
  const removeParticipant = useRemoveParticipantMutation(bunchId, bundleId);
  const publishMutation = usePublishBundleMutation(bunchId, bundleId);
  // 초안이 열려 있는 동안 실시간으로 연결(발행·삭제되면 끊음). 끊긴 사이의 변경은 다시 연결될 때 최신 상세로 맞춤
  const presenceState = usePresence(bunchId, bundleId);
  // 내 사진·참여자 변경 요청이 진행 중일 때 받은 그 type의 이벤트(전체 목록)를 적용하지 않고, 요청이 끝나면 최신 상세로 맞춤
  const holdEventRef = useRef<(_type: string) => boolean>(() => false);
  const realtime = useBundleRealtime(bunchId, bundleId, detail?.status === 'DRAFT', {
    holdEvent: (type) => holdEventRef.current(type),
    // 전체 PRESENCE로 교체하고, 연결(재연결)되면 놓친 현재 상태를 다시 읽음
    onPresence: presenceState.apply,
    onConnected: presenceState.refresh,
  });

  // 위치: 서버 목록 위에 응답을 기다리는 내 변경을 얹어 보임. 연결이 끊겼을 때의 막기는 아래 동작 감싸기가 맡음
  const placeActions = useBundleLocations({
    bunchId,
    bundleId,
    serverLocations: detail?.locations ?? NO_LOCATIONS,
    blocked: false,
    // 실시간 연결이 끊긴 순간 바로(렌더 전에) 대기 중인 변경을 막음
    isOffline: realtime.isDown,
  });
  const locations = placeActions.locations;
  // 발행 요청 중(publishing): 응답 전에 캐시가 먼저 PUBLISHED로 바뀌어도 「업로드됐어요」 창을 띄우지 않음
  // 내가 발행한 뒤(published): 「없는 초안」 안내 없이 이동을 기다림
  const [publishPhase, setPublishPhase] = useState<'idle' | 'publishing' | 'published'>('idle');
  // 업로드 직전 공개 범위 화면에서 고른 값(서버에는 발행 요청으로만 보냄). 고르기 전에는 서버의 초안 값
  const [visibilityChoice, setVisibilityChoice] = useState<DraftVisibility | undefined>(undefined);
  // 네트워크 오류 뒤 같은 내용으로 다시 업로드할 때 같은 요청 키를 써서 한 번만 발행되게 함(기능 spec 4.3.9·4.3.12)
  const publishAttempt = useRef<{ signature: string; key: string } | undefined>(undefined);

  // 저장·사진 대기열·발행이 함께 기준으로 삼는 최신 상세(렌더 밖 이벤트·타이머에서만 읽고 씀)
  const detailRef = useRef<BundleDetail | undefined>(undefined);
  const readDetail = useCallback(() => detailRef.current, []);
  const writeDetail = useCallback((next: BundleDetail) => {
    detailRef.current = next;
  }, []);
  // 보내기 직전에 지금 연결이 끊겼는지 바로 확인(실시간 연결·브라우저 오프라인·보류 이벤트 재조회 실패)
  // 끊김을 아는 상태는 렌더 뒤 effect에서 반영돼, 그 사이에 대기열의 다음 요청이 나가지 않게 함
  const offlineNowRef = useRef<() => boolean>(() => false);
  const isOfflineNow = useCallback(() => offlineNowRef.current(), []);
  const myIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    detailRef.current = detail;
    myIdRef.current = profile?.memberId;
  }, [detail, profile?.memberId]);

  const autosave = useDraftAutosave({
    readDetail,
    writeDetail,
    myIdRef,
    isOffline: isOfflineNow,
    refetchDetail,
    // 서버 문서에서 파생한 로컬 문서(저장 전 입력과 병합된 원격 변경 포함)를 통째로 보내면 서버가 병합함
    saveTitle: async () => {
      await ensureTitleCrdt();
      const state = titleCrdtRef.current.serialize();
      if (state === undefined) throw new Error('title crdt is not ready');
      return saveTitle.mutateAsync(state);
    },
    saveDate: saveDate.mutateAsync,
    saveComment: saveComment.mutateAsync,
  });
  const { pending, change, schedule } = autosave;
  const photoQueue = useDraftPhotoQueue({
    readDetail,
    writeDetail,
    isOffline: isOfflineNow,
    refetchDetail,
    changePhotos: changePhotos.mutateAsync,
    movePhoto: movePhotoMutation.mutateAsync,
  });

  const members = useMemo(
    () =>
      detail && bunchMembers ? bunchMembers.map((m) => toDraftMember(m, detail.createdBy)) : [],
    [detail, bunchMembers],
  );
  const myId = profile?.memberId;
  const viewer = useMemo<DraftViewer | undefined>(() => {
    const me = bunchMembers?.find((member) => member.id === myId);
    if (!myId || !me) return undefined;
    return { memberId: myId, bunchRole: members.find((m) => m.id === myId)?.bunchRole ?? 'member' };
  }, [bunchMembers, members, myId]);

  const localPhotos = photoQueue.localPhotos;
  const draft = useMemo<Draft | undefined>(() => {
    if (!detail || !bunchMembers || !myId) return undefined;
    const base = toDraft({ detail, bunchMembers, locations });
    const photos = localPhotos ?? base.photos;
    return {
      ...base,
      // 제목은 로컬 CRDT 문서의 원문(입력 중 띄어쓰기·커서 위치 유지, 원격 변경 병합). 문서를 불러오기 전에는 서버 제목
      title: titleCrdt.text ?? base.title,
      // 누가 어디를 작업 중인지와 들어와 있는지(실시간 presence, 잠금 없음)
      editing: presenceState.presence.editing,
      viewingMemberIds: presenceState.presence.viewingMemberIds,
      date: pending.date === undefined ? base.date : pending.date,
      visibility: visibilityChoice ?? base.visibility,
      photos,
      comments: withPendingComment(base.comments, myId, pending.comment),
    };
  }, [
    detail,
    bunchMembers,
    locations,
    myId,
    pending,
    localPhotos,
    titleCrdt.text,
    presenceState.presence,
    visibilityChoice,
  ]);

  const isParticipant = draft?.members.some((member) => member.id === myId) ?? false;
  // presence 명령은 연결된 동안 이 초안을 보는 중일 때만 보냄(비참여 멤버는 VIEW만)
  const presenceCommands = usePresenceSender({
    send: realtime.sendPresence,
    connected: realtime.status === 'connected',
    viewing: detail?.status === 'DRAFT',
    participant: isParticipant,
  });

  // 편집 중 참여 멤버에서 빠지면 바로 보기 전용이 되고 안내(기능 spec 4.3.2). 내가 직접 나가는 중에는 이동하므로 안내하지 않음
  const leaving = useIsMutating({ mutationKey: bundleMutationKeys.leave }) > 0;
  const wasParticipant = useRef(false);
  useEffect(() => {
    if (draft === undefined || detail?.status !== 'DRAFT') return;
    if (wasParticipant.current && !isParticipant && !leaving) {
      toast(BUNDLE_MESSAGES.removedFromDraft);
    }
    wasParticipant.current = isParticipant;
  }, [draft, detail?.status, isParticipant, leaving]);

  const busy =
    autosave.flushing ||
    placeActions.pending ||
    !isEmptyPending(pending) ||
    photoQueue.busy ||
    addParticipant.isPending ||
    removeParticipant.isPending ||
    publishMutation.isPending;

  // 화면에 보이는 사진 목록(서버 값 또는 보내는 중인 화면 값)을 연속 조작의 기준으로 둠
  const { syncShown } = photoQueue;
  useEffect(() => {
    syncShown(draft?.photos ?? []);
  }, [draft?.photos, syncShown]);

  const participantBusy = addParticipant.isPending || removeParticipant.isPending;
  // 요청이 끝나면 보류했던 이벤트를 대신해 최신 상세를 받음(실패를 다 쓰면 연결 끊김과 같은 배너와 편집 제한)
  const heldResync = useHeldEventResync({
    busy: photoQueue.busy || participantBusy || photoQueue.dragging,
    refetchDetail,
    onResynced: photoQueue.onResynced,
  });
  useEffect(() => {
    offlineNowRef.current = () =>
      realtime.isDown() ||
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      heldResync.isFailed();
  });

  // 화면의 오프라인 배너와 같은 조건: 브라우저가 오프라인이거나 실시간 연결이 끊김
  const { online } = useOnlineStatus();
  const offline = !online || realtime.down || heldResync.failed;
  // 연결이 끊기면 서버에 보내지 못한 수정은 버림(기능 spec 4.3.14). 다시 연결되면 최신 상세로 맞춤
  // 이미 보낸 요청의 결과는 서버 기준이라 재연결 뒤 상세로 복구되고, 오프라인 큐로 다시 보내지 않음
  const discardUnsent = () => {
    autosave.discard();
    placeActions.discard();
    photoQueue.discard();
    titleCrdtRef.current.reset();
  };
  const discardUnsentRef = useRef(discardUnsent);
  useEffect(() => {
    discardUnsentRef.current = discardUnsent;
  });
  useEffect(() => {
    holdEventRef.current = (type) => {
      const hold =
        (type === 'PHOTOS' && photoQueue.holdsEvents()) ||
        (type === 'PARTICIPANTS' && participantBusy);
      if (hold) heldResync.markHeld();
      return hold;
    };
  });
  useEffect(() => {
    if (offline) discardUnsentRef.current();
  }, [offline]);

  const rawActions: RawActions = {
    setTitle: (title) => {
      // 문서를 아직 불러오지 못했으면 입력을 받지 않음(서버 제목이 그대로 보임)
      if (!titleCrdt.edit(title)) return;
      change((current) => ({ ...current, title }));
      // 실제로 입력한 제목 전체를 다른 멤버에게 보임(저장이 아니라 입력 표시)
      presenceCommands.type('TITLE', title);
      schedule(SAVE_DELAY_MS);
    },
    setTitleComposing: titleCrdt.setComposing,
    saveNow: autosave.saveNow,
    presence: presenceCommands,
    setComment: (memberId, text) => {
      // 서버는 본인 코멘트만 저장할 수 있음
      if (memberId !== myIdRef.current) return;
      change((current) => ({ ...current, comment: text }));
      presenceCommands.type('COMMENT', text);
      schedule(SAVE_DELAY_MS);
    },
    // 공개 범위는 고르기만 하고 저장하지 않음: 업로드(발행) 요청에 최종 선택을 함께 보냄(v5 명세)
    setVisibility: (visibility) => setVisibilityChoice(visibility ?? undefined),
    addLocation: placeActions.add,
    replaceLocation: placeActions.replace,
    removeLocation: placeActions.remove,
    moveLocation: placeActions.move,
    setDate: (date) => {
      change((current) => ({ ...current, date }));
      schedule(0);
    },
    addMember: (memberId) => {
      if (!draft || draft.members.some((joined) => joined.id === memberId)) return;
      if (!bunchMembers?.some((member) => member.id === memberId)) return;
      addParticipant.mutate(memberId, {
        onError: () => toast(BUNDLE_MESSAGES.saveFailed),
      });
    },
    removeMember: (memberId) =>
      removeParticipant.mutate(memberId, {
        onError: () => toast(BUNDLE_MESSAGES.saveFailed),
      }),
    ...photoQueue.actions,
    setPhotoDragging: (dragging, photoId) =>
      photoQueue.actions.setPhotoDragging(dragging, photoId, heldResync.hasHeldEvent()),
    searchPlaces: searchPlacesApi,
    publish: async () => {
      // 보내는 중인 위치 변경이 끝난 뒤의 서버 구성으로 발행함(위치 변경이 발행보다 늦게 도착하지 않도록)
      const placeResult = await placeActions.settled();
      // 위치 변경이 거절·실패했으면(알림은 그때 이미 띄움) 서버에 반영되지 않은 구성으로 발행하지 않음
      if (placeResult.failed) return 'blocked';
      // 위치 응답은 상세 revision을 올리지 않으므로 보낸 요청이 있었으면 최신 상세로 맞춘 뒤 발행함
      if (placeResult.sent) {
        const refreshed = await refetchDetail();
        // 최신 상세를 받지 못하면 낡은 revision으로 발행을 시도하지 않음
        if (refreshed.isError || !refreshed.data) {
          toast(BUNDLE_MESSAGES.saveFailed);
          return 'failed';
        }
        // effect가 ref를 갱신하기를 기다리지 않고 받은 상세를 바로 기준으로 삼음
        detailRef.current = pickNewerDetail(detailRef.current, refreshed.data);
      }
      // 보내는 중인 사진 변경이 끝난 뒤의 서버 구성으로 발행함
      const photoResult = await photoQueue.settled();
      if (photoResult.failed) {
        toast(BUNDLE_MESSAGES.photosChangeFailed);
        return 'blocked';
      }
      autosave.cancelScheduled();
      // 저장하지 못한 입력이 남아 있으면 발행하지 않음(서버는 저장된 내용만 발행함)
      // 진행 중이던 저장이 막 끝나는 순간 들어온 입력이 남을 수 있어 한 번 더 확인
      let saved = await autosave.flush();
      if (!saved) saved = await autosave.flush();
      if (!saved) {
        toast(BUNDLE_MESSAGES.saveFailed);
        return 'failed';
      }
      const latest = detailRef.current;
      if (!latest) return 'failed';
      const chosen = visibilityChoice ?? toDraftVisibility(latest.visibility);
      if (chosen === null) {
        toast(BUNDLE_MESSAGES.uploadIncomplete);
        return 'blocked';
      }
      // 같은 키에 다른 내용을 보내면 서버가 거절하므로 범위나 revision이 바뀌면 새 키를 씀
      const visibility = chosen === 'public' ? 'PUBLIC' : 'PRIVATE';
      const signature = `${visibility}:${latest.revision}`;
      if (publishAttempt.current?.signature !== signature) {
        publishAttempt.current = { signature, key: createIdempotencyKey() };
      }
      setPublishPhase('publishing');
      try {
        await publishMutation.mutateAsync({
          visibility,
          expectedRevision: latest.revision,
          idempotencyKey: publishAttempt.current.key,
        });
        publishAttempt.current = undefined;
        setPublishPhase('published');
        return 'published';
      } catch (error) {
        // 먼저 끝난 발행이 있으면 발행 완료 상태 유지
        setPublishPhase((phase) => (phase === 'published' ? phase : 'idle'));
        const { outcome, message, keepKey } = classifyPublishError(error);
        if (!keepKey) publishAttempt.current = undefined;
        toast(message);
        return outcome;
      }
    },
  };

  // 연결이 끊긴 동안은 편집 동작이 반응하지 않음(기능 spec 4.3.14). 이미 열린 시트·확인 창에서 늦게 눌러도 서버로 보내지 않음
  const downRef = useRef(offline);
  useEffect(() => {
    downRef.current = offline;
  });
  // 동작이 불릴 때만 ref를 읽음(렌더 중에는 읽지 않음). 막히면 false(결과를 알려 주는 동작만 그 값을 씀)
  const guarded = (run: () => void) => {
    if (downRef.current) return false;
    run();
    return true;
  };
  const actions: DraftActions = {
    ...rawActions,
    setTitle: (...args) => guarded(() => rawActions.setTitle(...args)),
    setComment: (...args) => guarded(() => rawActions.setComment(...args)),
    addLocation: (...args) => guarded(() => rawActions.addLocation(...args)),
    replaceLocation: (...args) => guarded(() => rawActions.replaceLocation(...args)),
    removeLocation: (...args) => guarded(() => rawActions.removeLocation(...args)),
    moveLocation: (...args) => guarded(() => rawActions.moveLocation(...args)),
    setDate: (...args) => guarded(() => rawActions.setDate(...args)),
    addMember: (...args) => guarded(() => rawActions.addMember(...args)),
    removeMember: (...args) => guarded(() => rawActions.removeMember(...args)),
    removePhoto: (...args) => guarded(() => rawActions.removePhoto(...args)),
    movePhoto: (...args) => guarded(() => rawActions.movePhoto(...args)),
    replacePhotos: (...args) => guarded(() => rawActions.replacePhotos(...args)),
  };

  // 기본 번치가 없거나 내가 그 번치 멤버가 아니면 이 초안을 볼 수 없어 없는 초안과 같은 안내로 이동
  const noAccess =
    (profile !== undefined && !profile.bunch) ||
    (bunchMembers !== undefined && profile !== undefined && viewer === undefined);
  const missing =
    bundleId === undefined ||
    noAccess ||
    (detailIsError && ['RESOURCE_001', 'AUTH_002'].includes(errorCodeOf(detailError) ?? '')) ||
    (detail?.status === 'PUBLISHED' && publishPhase === 'idle');
  // 번치 멤버는 받아 둔 목록이 있으면 다시 받기에 실패해도 그대로 씀(참여 멤버 관리에 들어올 때마다 다시 받음, 상세와 같은 기준)
  const failed =
    profileError ||
    (membersError && bunchMembers === undefined) ||
    (detailIsError && !missing && detail === undefined);
  const retry = () => {
    if (profileError) void refetchProfile();
    if (membersError) void refetchMembers();
    if (detailIsError) void refetchDetail();
  };

  let state: DraftState = { kind: 'loading' };
  if (missing) {
    state = {
      kind: 'missing',
      reason: detail?.status === 'PUBLISHED' && publishPhase === 'idle' ? 'published' : 'deleted',
      publisherNickname: detail?.publisherNickname,
    };
  } else if (failed) state = { kind: 'error', retry };
  else if (draft && viewer && publishPhase !== 'published') {
    state = {
      kind: 'ready',
      draft,
      viewer,
      bunchMembers: members,
      saveStatus: autosave.stalled ? 'failed' : busy ? 'saving' : 'saved',
      realtime: {
        down: realtime.down || heldResync.failed,
        retry: () => {
          realtime.retry();
          if (heldResync.failed) heldResync.retry();
        },
      },
      titleReady: titleCrdt.ready,
      titleFailed: titleCrdt.failed,
      retryTitle: titleCrdt.retry,
    };
  }

  return { state, actions };
}

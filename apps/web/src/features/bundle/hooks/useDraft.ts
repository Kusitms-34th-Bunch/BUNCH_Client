'use client';
// 크기 유지: 저장·사진·위치·재조회·발행 hook 결과를 화면 상태와 연결 가드 동작으로 묶는 자리(묶음 동작은 넘길 값이 많아 여기 둠, #540)

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toWireId } from '@/shared/api/client/ids';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { DraftActions, DraftState, RawActions } from '../lib/draftContract';
import type { Draft, DraftLocation, DraftViewer, DraftVisibility } from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import { searchPlaces as searchPlacesApi } from '../api/places';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { draftAvailability } from '../lib/draftAvailability';
import { toDraft, toDraftMember, withPendingComment } from '../lib/draftMapping';
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
import { useBundleLocations } from './useBundleLocations';
import { useBundleRealtime } from './useBundleRealtime';
import { isEmptyPending, useDraftAutosave } from './useDraftAutosave';
import { useDraftPhotoQueue } from './useDraftPhotoQueue';
import { useDraftPublish } from './useDraftPublish';
import { useGuardedDraftActions } from './useGuardedDraftActions';
import { useHeldEventResync } from './useHeldEventResync';
import { useOnlineStatus } from './useOnlineStatus';
import { usePresence } from './usePresence';
import { usePresenceSender } from './usePresenceSender';
import { useRemovedFromDraftNotice } from './useRemovedFromDraftNotice';
import { useTitleCrdt } from './useTitleCrdt';

export type { ReplacePhotosOptions } from './useDraftPhotoQueue';
export type { DraftActions, DraftState, PublishOutcome } from '../lib/draftContract';

// 위치가 없을 때 쓰는 고정된 빈 목록(렌더마다 새 배열이 되어 draft를 다시 만들지 않게 함)
const NO_LOCATIONS: readonly DraftLocation[] = [];

// 입력이 멈추고 이만큼 지나면 저장(기능 spec 4.3.14의 「입력이 1초 멈출 때 저장」), 날짜는 고르는 즉시 저장하고 공개 범위는 발행 요청으로만 보냄
const SAVE_DELAY_MS = 1000;

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
    // 실시간 연결이 끊긴 순간 바로(렌더 전에) 대기 중인 변경을 막음. 브라우저 오프라인은 hook이 직접 보고, 보류 재조회 실패는 보지 않음(DraftScreen.spec.md)
    isOffline: realtime.isDown,
  });
  const locations = placeActions.locations;
  // 업로드 직전 공개 범위 화면에서 고른 값(서버에는 발행 요청으로만 보냄). 고르기 전에는 서버의 초안 값
  const [visibilityChoice, setVisibilityChoice] = useState<DraftVisibility | undefined>(undefined);

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

  // 위치 → 사진 → 저장을 차례로 기다린 뒤 발행(발행 단계는 「업로드됐어요」 창 판단에도 씀)
  const draftPublish = useDraftPublish({
    settlePlaces: placeActions.settled,
    settlePhotos: photoQueue.settled,
    autosave,
    refetchDetail,
    readDetail,
    writeDetail,
    visibilityChoice,
    publishMutation,
  });
  const { publishPhase } = draftPublish;

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

  const { localPhotos, frozenPhotos } = photoQueue;
  const draft = useMemo<Draft | undefined>(() => {
    if (!detail || !bunchMembers || !myId) return undefined;
    const base = toDraft({ detail, bunchMembers, locations });
    const photos = localPhotos ?? frozenPhotos ?? base.photos;
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
    frozenPhotos,
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

  useRemovedFromDraftNotice(draft !== undefined && detail?.status === 'DRAFT', isParticipant);

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
    publish: draftPublish.publish,
  };

  // 연결이 끊긴 동안은 편집 동작이 반응하지 않음(기능 spec 4.3.14). 이미 열린 시트·확인 창에서 늦게 눌러도 서버로 보내지 않음
  const downRef = useRef(offline);
  useEffect(() => {
    downRef.current = offline;
  });
  const isDown = useCallback(() => downRef.current, []);
  const actions = useGuardedDraftActions(rawActions, isDown);

  const { missing, failed } = draftAvailability({
    bundleId,
    profile,
    profileError,
    bunchMembers,
    membersError,
    hasViewer: viewer !== undefined,
    detail,
    detailIsError,
    detailError,
    publishPhase,
  });
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

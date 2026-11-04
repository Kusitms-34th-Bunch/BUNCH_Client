'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { readPublishBlockers, readVersionConflict } from '../api/bundles';
import { leaseTransport, type LeaseTarget } from '../api/leases';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../constants/messages';
import { placeFixture } from '../fixtures/draft.fixture';
import { toDraft, toDraftMember } from '../lib/draftMapping';
import { movePhoto, removePhoto, setPhotoCaption } from '../lib/photos';
import {
  bundleQueryOptions,
  useAddParticipantMutation,
  usePublishBundleMutation,
  useRemoveParticipantMutation,
  useSaveCaptionMutation,
  useSaveCommentMutation,
  useSaveDateMutation,
  useSaveTitleMutation,
  useSaveVisibilityMutation,
} from '../queries/bundles';

// 입력이 멈추고 이만큼 지나면 저장(기능 spec 4.3.14의 「입력이 1초 멈출 때 저장」), 공개 범위·날짜는 고르는 즉시 저장
const SAVE_DELAY_MS = 1000;
// 저장이 실패한 뒤 같은 입력으로 다시 시도하기까지의 시간
const RETRY_DELAY_MS = 3000;

/** 장소 검색 API 연결 전 목 검색(이름·주소에 키워드가 들어 있으면 결과). 렌더마다 바뀌지 않도록 hook 밖에 둠 */
const searchPlaces = (keyword: string): Promise<readonly PlaceResult[]> => {
  const query = keyword.trim();
  return Promise.resolve(
    query === ''
      ? []
      : placeFixture.filter((place) => place.name.includes(query) || place.address.includes(query)),
  );
};

export type DraftState =
  | { kind: 'missing' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      draft: Draft;
      viewer: DraftViewer;
      /** 번치 멤버 전체(참여하지 않은 멤버 포함) */
      bunchMembers: readonly DraftMember[];
      saveStatus: SaveStatus;
    };

/** 발행 시도 결과(화면은 성공일 때만 이동하고 나머지는 안내가 이미 나감) */
export type PublishOutcome = 'published' | 'blocked' | 'failed';

export type DraftActions = {
  setTitle: (_title: string) => void;
  setComment: (_memberId: string, _text: string) => void;
  setVisibility: (_visibility: DraftVisibility) => void;
  addLocation: (_place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  setDate: (_date: string | null) => void;
  /** 번치 멤버를 참여 멤버 맨 아래에 더함(이미 참여 중이거나 번치 멤버가 아니면 무시) */
  addMember: (_memberId: string) => void;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제) */
  removeMember: (_memberId: string) => void;
  /** 사진 캡션을 바꿈(최대 글자 수 보정은 호출하는 쪽이 함) */
  setPhotoCaption: (_photoId: string, _caption: string) => void;
  /** 사진을 번들에서 뺌(1장이면 무시, 캡션도 함께 사라짐). 서버 반영은 후속이라 이 화면에서만 바뀜 */
  removePhoto: (_photoId: string) => void;
  /** 사진을 다른 자리(0부터)로 옮김(캡션은 사진을 따라감). 서버 반영은 후속이라 이 화면에서만 바뀜 */
  movePhoto: (_photoId: string, _toIndex: number) => void;
  /** 사진 추가 화면에서 적용한 결과로 사진 목록 전체를 바꿈. 서버 반영은 후속이라 이 화면에서만 바뀜 */
  replacePhotos: (_photos: readonly DraftPhoto[]) => void;
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
  /** 저장하지 못한 입력을 먼저 저장한 뒤 발행 */
  publish: () => Promise<PublishOutcome>;
};

// 아직 서버에 저장하지 못한 입력(필드마다 마지막 값만 보관)
type Pending = {
  title?: string;
  visibility?: DraftVisibility;
  /** null은 날짜를 지우는 값 */
  date?: string | null;
  comment?: string;
  captions?: Readonly<Record<string, string>>;
};

const isEmpty = (pending: Pending) =>
  pending.title === undefined &&
  pending.visibility === undefined &&
  pending.date === undefined &&
  pending.comment === undefined &&
  Object.keys(pending.captions ?? {}).length === 0;

const errorCode = (error: unknown) => (error as { code?: string } | null)?.code;

/**
 * 초안 상태와 동작: 내 프로필·번치 멤버·번들 상세 query를 화면의 `Draft`로 합치고, 입력은 바로 화면에 반영한 뒤
 * 멈추면 서버에 저장(필드별 버전·편집권 token 사용, 충돌이면 최신 상세를 받아 이어서 저장)
 * 위치는 서버에 필드가 없어 이 화면에서만 들고 있고, 사진 구성·순서 변경은 서버 연동 전이라 이 화면에서만 바뀜
 */
export function useDraft(draftId: string | undefined): {
  state: DraftState;
  actions: DraftActions;
} {
  // 서버 번들 ID는 숫자라 숫자로 바꿀 수 없는 주소는 없는 초안으로 처리
  const bundleId = draftId !== undefined && toWireId(draftId) !== undefined ? draftId : undefined;
  const { data: profile, isError: profileError } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const { data: bunchMembers, isError: membersError } = useQuery(bunchMembersQueryOptions(bunchId));
  const {
    data: detail,
    error: detailError,
    isError: detailIsError,
  } = useQuery(bundleQueryOptions(bunchId, bundleId));

  const saveTitle = useSaveTitleMutation(bunchId, bundleId);
  const saveVisibility = useSaveVisibilityMutation(bunchId, bundleId);
  const saveDate = useSaveDateMutation(bunchId, bundleId);
  const saveCaption = useSaveCaptionMutation(bunchId, bundleId);
  const saveComment = useSaveCommentMutation(bunchId, bundleId);
  const addParticipant = useAddParticipantMutation(bunchId, bundleId);
  const removeParticipant = useRemoveParticipantMutation(bunchId, bundleId);
  const publishMutation = usePublishBundleMutation(bunchId, bundleId);

  const [pending, setPending] = useState<Pending>({});
  const [locations, setLocations] = useState<readonly DraftLocation[]>([]);
  const [localPhotos, setLocalPhotos] = useState<readonly DraftPhoto[] | undefined>(undefined);
  const [flushing, setFlushing] = useState(false);
  // 내가 발행해 서버가 발행본으로 바꾼 뒤에는 「없는 초안」 안내 없이 이동을 기다림
  const [publishedByMe, setPublishedByMe] = useState(false);

  // 비동기 저장 루프가 항상 최신 값을 읽도록 ref에 둠(렌더 밖 이벤트·타이머에서만 읽고 씀)
  const pendingRef = useRef<Pending>({});
  const detailRef = useRef<BundleDetail | undefined>(undefined);
  const myIdRef = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const running = useRef(false);
  const again = useRef(false);
  const alive = useRef(true);
  // 타이머가 항상 최신 flush를 부르도록 ref로 한 번 거침(flush가 자기 자신을 예약하므로)
  const flushRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  useEffect(() => {
    detailRef.current = detail;
    myIdRef.current = profile?.memberId;
  }, [detail, profile?.memberId]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const change = useCallback((update: (_current: Pending) => Pending) => {
    pendingRef.current = update(pendingRef.current);
    setPending(pendingRef.current);
  }, []);

  // 저장에 성공한 값이 그 사이 더 바뀌지 않았을 때만 입력 보관을 비움
  const clearField = useCallback(
    (key: Exclude<keyof Pending, 'captions'>, value: unknown) => {
      change((current) => {
        if (current[key] !== value) return current;
        const { [key]: _saved, ...rest } = current;
        return rest;
      });
    },
    [change],
  );
  const clearCaption = useCallback(
    (photoId: string, value: string) => {
      change((current) => {
        if (current.captions?.[photoId] !== value) return current;
        const { [photoId]: _saved, ...rest } = current.captions;
        return { ...current, captions: rest };
      });
    },
    [change],
  );

  // 편집권을 얻어 저장하고 바로 풂. 다른 멤버가 쥐고 있으면 'locked'
  const withLease = useCallback(
    async (target: LeaseTarget, save: (_token: string) => Promise<BundleDetail>) => {
      if (!bunchId || !bundleId) throw new Error('bundle is not loaded');
      let token: string;
      try {
        token = (await leaseTransport.acquire(bunchId, bundleId, target)).token;
      } catch (error) {
        if (errorCode(error) === 'BUNDLE_004') return 'locked' as const;
        throw error;
      }
      try {
        return await save(token);
      } finally {
        await leaseTransport.release(bunchId, bundleId, target, token).catch(() => undefined);
      }
    },
    [bunchId, bundleId],
  );

  // 보관 중인 입력을 필드별로 저장. 충돌은 최신 상세를 받은 뒤 같은 입력으로 다시, 실패는 잠시 뒤 다시 시도
  const flush = useCallback(async (): Promise<boolean> => {
    if (running.current) {
      again.current = true;
      return false;
    }
    running.current = true;
    setFlushing(true);
    let retryAfter: number | undefined;
    try {
      do {
        again.current = false;
        const base = detailRef.current;
        const snapshot = pendingRef.current;
        if (!base || isEmpty(snapshot)) break;
        const common = { mode: 'DRAFT' as const };
        const run = async (
          save: () => Promise<BundleDetail | 'locked'>,
          onSaved: () => void,
          onLocked: () => void,
        ) => {
          try {
            const result = await save();
            if (result === 'locked') {
              onLocked();
              toast(BUNDLE_MESSAGES.fieldLocked, { fullWidth: true });
            } else {
              detailRef.current = result;
              onSaved();
            }
          } catch (error) {
            if (readVersionConflict(error) !== undefined) retryAfter = 200;
            else retryAfter = RETRY_DELAY_MS;
          }
        };

        if (snapshot.title !== undefined) {
          const value = snapshot.title;
          await run(
            () =>
              withLease('TITLE', (leaseToken) =>
                saveTitle.mutateAsync({
                  ...common,
                  value,
                  expectedVersion: (detailRef.current ?? base).titleVersion,
                  leaseToken,
                }),
              ),
            () => clearField('title', value),
            () => clearField('title', value),
          );
        }
        if (snapshot.visibility !== undefined) {
          const value = snapshot.visibility;
          await run(
            () =>
              saveVisibility.mutateAsync({
                ...common,
                value: value === 'public' ? 'PUBLIC' : 'PRIVATE',
                expectedVersion: (detailRef.current ?? base).visibilityVersion,
              }),
            () => clearField('visibility', value),
            () => clearField('visibility', value),
          );
        }
        if (snapshot.date !== undefined) {
          const value = snapshot.date;
          await run(
            () =>
              withLease('DATE', (leaseToken) =>
                saveDate.mutateAsync({
                  ...common,
                  value,
                  expectedVersion: (detailRef.current ?? base).dateVersion,
                  leaseToken,
                }),
              ),
            () => clearField('date', value),
            () => clearField('date', value),
          );
        }
        if (snapshot.comment !== undefined) {
          const value = snapshot.comment;
          await run(
            () => {
              const latest = detailRef.current ?? base;
              const mine = latest.comments.find((c) => c.memberId === myIdRef.current);
              return saveComment.mutateAsync({
                ...common,
                value,
                expectedVersion: mine?.version ?? 0,
              });
            },
            () => clearField('comment', value),
            () => clearField('comment', value),
          );
        }
        for (const [photoId, value] of Object.entries(snapshot.captions ?? {})) {
          await run(
            () => {
              const photo = (detailRef.current ?? base).photos.find((p) => p.id === photoId);
              if (!photo) return Promise.resolve(detailRef.current ?? base);
              return withLease(`PHOTO:${photoId}`, (leaseToken) =>
                saveCaption.mutateAsync({
                  ...common,
                  bundlePhotoId: photoId,
                  value,
                  expectedVersion: photo.captionVersion,
                  leaseToken,
                }),
              );
            },
            () => clearCaption(photoId, value),
            () => clearCaption(photoId, value),
          );
        }
      } while (again.current && retryAfter === undefined);
    } finally {
      running.current = false;
      if (alive.current) setFlushing(false);
    }
    if (retryAfter !== undefined && alive.current && !isEmpty(pendingRef.current)) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current(), retryAfter);
      return false;
    }
    return isEmpty(pendingRef.current);
  }, [
    clearCaption,
    clearField,
    saveCaption,
    saveComment,
    saveDate,
    saveTitle,
    saveVisibility,
    withLease,
  ]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback((delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

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

  const draft = useMemo<Draft | undefined>(() => {
    if (!detail || !bunchMembers || !myId) return undefined;
    const base = toDraft({ detail, bunchMembers, locations, myMemberId: myId });
    const captionOf = (photo: DraftPhoto) => pending.captions?.[photo.id] ?? photo.caption;
    const photos = (localPhotos ?? base.photos).map((photo) => ({
      ...photo,
      caption: captionOf(photo),
    }));
    const hasMyComment = base.comments.some((comment) => comment.memberId === myId);
    return {
      ...base,
      title: pending.title ?? base.title,
      date: pending.date === undefined ? base.date : pending.date,
      visibility: pending.visibility ?? base.visibility,
      photos,
      comments:
        pending.comment === undefined
          ? base.comments
          : hasMyComment
            ? base.comments.map((comment) =>
                comment.memberId === myId
                  ? { ...comment, text: pending.comment as string }
                  : comment,
              )
            : [...base.comments, { memberId: myId, text: pending.comment }],
    };
  }, [detail, bunchMembers, locations, myId, pending, localPhotos]);

  const busy =
    flushing ||
    !isEmpty(pending) ||
    addParticipant.isPending ||
    removeParticipant.isPending ||
    publishMutation.isPending;

  const actions: DraftActions = {
    setTitle: (title) => {
      change((current) => ({ ...current, title }));
      schedule(SAVE_DELAY_MS);
    },
    setComment: (memberId, text) => {
      // 서버는 본인 코멘트만 저장할 수 있음
      if (memberId !== myIdRef.current) return;
      change((current) => ({ ...current, comment: text }));
      schedule(SAVE_DELAY_MS);
    },
    setVisibility: (visibility) => {
      change((current) => ({ ...current, visibility }));
      schedule(0);
    },
    addLocation: (place) =>
      setLocations((current) =>
        current.length >= MAX_LOCATIONS
          ? current
          : [...current, { id: place.id, name: place.name }],
      ),
    removeLocation: (locationId) =>
      setLocations((current) => current.filter((location) => location.id !== locationId)),
    setDate: (date) => {
      change((current) => ({ ...current, date }));
      schedule(0);
    },
    addMember: (memberId) => {
      if (!draft || draft.members.some((joined) => joined.id === memberId)) return;
      if (!bunchMembers?.some((member) => member.id === memberId)) return;
      addParticipant.mutate(memberId, {
        onError: () => toast(BUNDLE_MESSAGES.saveFailed, { fullWidth: true }),
      });
    },
    removeMember: (memberId) =>
      removeParticipant.mutate(memberId, {
        onError: () => toast(BUNDLE_MESSAGES.saveFailed, { fullWidth: true }),
      }),
    setPhotoCaption: (photoId, caption) => {
      change((current) => ({ ...current, captions: { ...current.captions, [photoId]: caption } }));
      schedule(SAVE_DELAY_MS);
      setLocalPhotos((current) => current && setPhotoCaption(current, photoId, caption));
    },
    removePhoto: (photoId) =>
      setLocalPhotos((current) => removePhoto(current ?? draft?.photos ?? [], photoId)),
    movePhoto: (photoId, toIndex) =>
      setLocalPhotos((current) => movePhoto(current ?? draft?.photos ?? [], photoId, toIndex)),
    replacePhotos: (photos) => setLocalPhotos(photos),
    searchPlaces,
    publish: async () => {
      clearTimeout(timer.current);
      // 저장하지 못한 입력이 남아 있으면 발행하지 않음(서버는 저장된 내용만 발행함)
      if (!(await flush())) {
        toast(BUNDLE_MESSAGES.saveFailed, { fullWidth: true });
        return 'failed';
      }
      const latest = detailRef.current;
      if (!latest) return 'failed';
      try {
        await publishMutation.mutateAsync(latest.revision);
        setPublishedByMe(true);
        return 'published';
      } catch (error) {
        if (readPublishBlockers(error) !== undefined) {
          toast(BUNDLE_MESSAGES.uploadIncomplete, { fullWidth: true });
          return 'blocked';
        }
        toast(
          readVersionConflict(error) === undefined && errorCode(error) !== 'BUNDLE_003'
            ? BUNDLE_MESSAGES.publishFailed
            : BUNDLE_MESSAGES.publishConflict,
          { fullWidth: true },
        );
        return 'failed';
      }
    },
  };

  const missing =
    bundleId === undefined ||
    (detailIsError && ['RESOURCE_001', 'AUTH_002'].includes(errorCode(detailError) ?? '')) ||
    (detail?.status === 'PUBLISHED' && !publishedByMe);
  const failed =
    profileError || membersError || (detailIsError && !missing && detail === undefined);

  let state: DraftState = { kind: 'loading' };
  if (missing) state = { kind: 'missing' };
  else if (failed) state = { kind: 'error' };
  else if (draft && viewer && !publishedByMe) {
    state = {
      kind: 'ready',
      draft,
      viewer,
      bunchMembers: members,
      saveStatus: busy ? 'saving' : 'saved',
    };
  }

  return { state, actions };
}

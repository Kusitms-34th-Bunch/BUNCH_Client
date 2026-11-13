'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
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
import { readPublishBlockers, readVersionConflict } from '../api/bundles';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../constants/messages';
import { placeFixture } from '../fixtures/draft.fixture';
import { toDraft, toDraftMember } from '../lib/draftMapping';
import { moveLocation } from '../lib/locations';
import { movePhoto, type PhotoMovePlan, planPhotoMoves, removePhoto } from '../lib/photos';
import {
  bundleQueryOptions,
  useAddParticipantMutation,
  useChangePhotosMutation,
  useMovePhotoMutation,
  usePublishBundleMutation,
  useRemoveParticipantMutation,
  useSaveCommentMutation,
  useSaveDateMutation,
  useSaveTitleMutation,
  useSaveVisibilityMutation,
} from '../queries/bundles';

// 입력이 멈추고 이만큼 지나면 저장(기능 spec 4.3.14의 「입력이 1초 멈출 때 저장」), 공개 범위·날짜는 고르는 즉시 저장
// 위치가 없을 때 쓰는 고정된 빈 목록(렌더마다 새 배열이 되어 draft를 다시 만들지 않게 함)
const NO_LOCATIONS: readonly DraftLocation[] = [];

const SAVE_DELAY_MS = 1000;
// 일시 오류 뒤 같은 입력으로 다시 시도하기까지의 시간(연속 실패 횟수만큼 길어짐)과 포기하기까지의 횟수
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 5;
// 버전 충돌은 최신 상세를 받은 직후 바로 이어서 저장
const CONFLICT_RETRY_DELAY_MS = 200;
// 다시 시도하면 될 수 있는 오류: 응답이 없는 네트워크 오류, 서버 오류(5xx)
// 그 밖의 거절(다른 사람이 발행·삭제, 인증·권한, 잘못된 입력 등 4xx)은 같은 요청을 다시 보내도 같은 결과
const isRetryable = (error: unknown) => {
  const { status } = (error as { status?: number } | null) ?? {};
  return status === undefined || status >= 500;
};

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
  /** 삭제됐거나 없는 초안(deleted), 다른 멤버가 업로드한 초안(published) */
  | { kind: 'missing'; reason: 'deleted' | 'published' }
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
    };

/** 발행 시도 결과(화면은 성공일 때만 이동하고 나머지는 안내가 이미 나감) */
export type PublishOutcome = 'published' | 'blocked' | 'failed';

export type DraftActions = {
  setTitle: (_title: string) => void;
  setComment: (_memberId: string, _text: string) => void;
  setVisibility: (_visibility: DraftVisibility) => void;
  addLocation: (_place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  /** 위치를 다른 자리로 옮김(햄버거를 잡고 끌어 순서 바꾸기, 자리는 0부터) */
  moveLocation: (_locationId: string, _toIndex: number) => void;
  setDate: (_date: string | null) => void;
  /** 번치 멤버를 참여 멤버 맨 아래에 더함(이미 참여 중이거나 번치 멤버가 아니면 무시) */
  addMember: (_memberId: string) => void;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제) */
  removeMember: (_memberId: string) => void;
  /** 사진을 번들에서 뺌(1장이면 무시). 서버 반영은 후속이라 이 화면에서만 바뀜 */
  removePhoto: (_photoId: string) => void;
  /** 사진을 다른 자리(0부터)로 옮김. 서버 반영은 후속이라 이 화면에서만 바뀜 */
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
};

const isEmpty = (pending: Pending) =>
  pending.title === undefined &&
  pending.visibility === undefined &&
  pending.date === undefined &&
  pending.comment === undefined;

const errorCode = (error: unknown) => (error as { code?: string } | null)?.code;

/**
 * 초안 상태와 동작: 내 프로필·번치 멤버·번들 상세 query를 화면의 `Draft`로 합치고, 입력은 바로 화면에 반영한 뒤
 * 멈추면 서버에 저장(필드별 버전 사용, 충돌이면 최신 상세를 받아 이어서 저장)
 * 위치는 서버에 필드가 없어 이 화면에서만 들고 있고, 사진 구성·순서 변경은 서버 연동 전이라 이 화면에서만 바뀜
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

  const saveTitle = useSaveTitleMutation(bunchId, bundleId);
  const saveVisibility = useSaveVisibilityMutation(bunchId, bundleId);
  const saveDate = useSaveDateMutation(bunchId, bundleId);
  const saveComment = useSaveCommentMutation(bunchId, bundleId);
  const changePhotos = useChangePhotosMutation(bunchId, bundleId);
  const movePhotoMutation = useMovePhotoMutation(bunchId, bundleId);
  const addParticipant = useAddParticipantMutation(bunchId, bundleId);
  const removeParticipant = useRemoveParticipantMutation(bunchId, bundleId);
  const publishMutation = usePublishBundleMutation(bunchId, bundleId);

  const [pending, setPending] = useState<Pending>({});
  // 화면에서 위치를 바꾸기 전에는 서버에 저장된 위치를 보이고, 바꾼 뒤에는 화면 값(위치 저장은 장소 검색 이슈에서 연결)
  const [editedLocations, setEditedLocations] = useState<readonly DraftLocation[] | undefined>(
    undefined,
  );
  const locations = editedLocations ?? detail?.locations ?? NO_LOCATIONS;
  const [localPhotos, setLocalPhotos] = useState<readonly DraftPhoto[] | undefined>(undefined);
  const [flushing, setFlushing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  // 내가 발행해 서버가 발행본으로 바꾼 뒤에는 「없는 초안」 안내 없이 이동을 기다림
  const [publishedByMe, setPublishedByMe] = useState(false);
  // 발행 요청을 보내는 동안: 응답 전에 캐시가 먼저 PUBLISHED로 바뀌어도 내가 올리는 중이라 「업로드됐어요」 창을 띄우지 않음
  const [publishing, setPublishing] = useState(false);
  // 저장을 포기한 상태(권한·상태 오류 또는 재시도 소진): 헤더가 「저장 실패」를 보이고 입력하면 다시 시도
  const [stalled, setStalled] = useState(false);
  // 입력란에 방금 친 원문: 서버가 앞뒤 공백을 지워 돌려줘도 입력 중 띄어쓰기가 사라지지 않게 보여 줌
  const [typed, setTyped] = useState<{ title?: string }>({});

  // 비동기 저장 루프가 항상 최신 값을 읽도록 ref에 둠(렌더 밖 이벤트·타이머에서만 읽고 씀)
  const pendingRef = useRef<Pending>({});
  const detailRef = useRef<BundleDetail | undefined>(undefined);
  // 사진 빼기·이동·추가는 순서대로 하나씩 서버에 보내고, 모두 끝나면 화면 값(localPhotos)을 버리고 서버 값을 보임
  const photoQueue = useRef<Promise<void>>(Promise.resolve());
  const photoOps = useRef(0);
  const photoFailed = useRef(false);
  const photoFailures = useRef(0);
  const shownPhotosRef = useRef<readonly DraftPhoto[]>([]);
  const myIdRef = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | undefined>(undefined);
  const again = useRef(false);
  const alive = useRef(true);
  // 연속으로 실패한 저장 횟수와 이번 실패에서 이미 안내했는지(입력이 새로 바뀌면 처음부터)
  const failures = useRef(0);
  const notified = useRef(false);
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
      // 입력 후 바로 화면을 떠나도 잃지 않도록 남은 입력을 한 번 저장(재시도는 하지 않음)
      if (!isEmpty(pendingRef.current)) void flushRef.current();
    };
  }, []);

  const change = useCallback((update: (_current: Pending) => Pending) => {
    pendingRef.current = update(pendingRef.current);
    setPending(pendingRef.current);
  }, []);

  // 저장에 성공한 값이 그 사이 더 바뀌지 않았을 때만 입력 보관을 비움
  const clearField = useCallback(
    (key: keyof Pending, value: unknown) => {
      change((current) => {
        if (current[key] !== value) return current;
        const { [key]: _saved, ...rest } = current;
        return rest;
      });
    },
    [change],
  );

  // 보관 중인 입력을 필드별로 저장하고 끝난 뒤 입력이 모두 비었는지 돌려줌
  // 충돌은 최신 상세를 받아 같은 입력으로 다시, 일시 오류는 정해진 횟수까지 다시 시도하고,
  // 권한·상태 오류는 재시도하지 않음(어느 경우도 입력은 지우지 않고 한 번만 안내)
  const runFlush = useCallback(async (): Promise<boolean> => {
    setFlushing(true);
    let retryAfter: number | undefined;
    let stop = false;
    const giveUp = () => {
      stop = true;
      if (alive.current) setStalled(true);
      if (!notified.current) {
        notified.current = true;
        toast(BUNDLE_MESSAGES.saveFailed);
      }
    };
    try {
      do {
        again.current = false;
        const base = detailRef.current;
        const snapshot = pendingRef.current;
        if (!base || isEmpty(snapshot)) break;
        const common = { mode: 'DRAFT' as const };
        // 필드 하나 저장: 성공하면 입력을 비우고 최신 응답을 기준으로 삼음
        const run = async (save: () => Promise<BundleDetail>, onSaved: () => void) => {
          try {
            const result = await save();
            // 늦게 도착한 낡은 응답이 최신 revision 기준을 덮지 않게 함
            if (!detailRef.current || result.revision >= detailRef.current.revision) {
              detailRef.current = result;
            }
            failures.current = 0;
            onSaved();
          } catch (error) {
            const code = errorCode(error);
            if (code === 'BUNDLE_003' || readVersionConflict(error) !== undefined) {
              // 최신 상세를 받아 그 버전으로 이어서 저장
              const latest = await refetchDetail();
              if (latest.data) detailRef.current = latest.data;
              retryAfter = CONFLICT_RETRY_DELAY_MS;
            } else if (!isRetryable(error)) {
              giveUp();
              // 삭제·발행·권한 변화는 상세를 다시 받아 화면이 알맞은 상태로 바뀌게 함
              void refetchDetail();
            } else retryAfter = RETRY_DELAY_MS;
          }
        };

        if (snapshot.title !== undefined) {
          const value = snapshot.title;
          await run(
            () =>
              saveTitle.mutateAsync({
                ...common,
                value,
                expectedVersion: (detailRef.current ?? base).titleVersion,
              }),
            () => clearField('title', value),
          );
        }
        if (snapshot.visibility !== undefined && !stop) {
          const value = snapshot.visibility;
          await run(
            () =>
              saveVisibility.mutateAsync({
                ...common,
                value: value === 'public' ? 'PUBLIC' : 'PRIVATE',
                expectedVersion: (detailRef.current ?? base).visibilityVersion,
              }),
            () => clearField('visibility', value),
          );
        }
        if (snapshot.date !== undefined && !stop) {
          const value = snapshot.date;
          await run(
            () =>
              saveDate.mutateAsync({
                ...common,
                value,
                expectedVersion: (detailRef.current ?? base).dateVersion,
              }),
            () => clearField('date', value),
          );
        }
        if (snapshot.comment !== undefined && !stop) {
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
          );
        }
      } while (again.current && retryAfter === undefined && !stop);
    } finally {
      if (alive.current) setFlushing(false);
    }
    const settled = isEmpty(pendingRef.current);
    if (settled) {
      failures.current = 0;
      notified.current = false;
    } else if (retryAfter !== undefined && !stop && alive.current) {
      failures.current += 1;
      if (failures.current > MAX_RETRIES) giveUp();
      else {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flushRef.current(), retryAfter * failures.current);
      }
    }
    // 포기하는 동안 새 입력이 들어왔으면(again) 처음부터 다시 시도
    if (stop && again.current && !settled && alive.current) {
      failures.current = 0;
      notified.current = false;
      setStalled(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current(), 0);
    }
    return settled;
  }, [clearField, refetchDetail, saveComment, saveDate, saveTitle, saveVisibility]);

  // 저장은 한 번에 하나만: 진행 중이면 그 결과를 함께 기다리고 끝난 뒤 한 번 더 확인하도록 표시
  const flush = useCallback((): Promise<boolean> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const promise = runFlush().finally(() => {
      inflight.current = undefined;
    });
    inflight.current = promise;
    return promise;
  }, [runFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback((delay: number) => {
    // 입력이 새로 바뀌면 이전 실패와 안내를 잊고 처음부터 다시 시도
    failures.current = 0;
    notified.current = false;
    setStalled(false);
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
    const base = toDraft({ detail, bunchMembers, locations });
    // 저장이 끝난 입력은 서버가 정리한 값(앞뒤 공백 제거)과 같을 때만 친 원문을 계속 보여 줌(다른 곳에서 바뀌면 서버 값)
    const photos = localPhotos ?? base.photos;
    const hasMyComment = base.comments.some((comment) => comment.memberId === myId);
    return {
      ...base,
      title:
        pending.title ??
        (typed.title !== undefined && typed.title.trim() === base.title ? typed.title : base.title),
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
  }, [detail, bunchMembers, locations, myId, pending, localPhotos, typed]);

  const busy =
    flushing ||
    !isEmpty(pending) ||
    photoBusy ||
    addParticipant.isPending ||
    removeParticipant.isPending ||
    publishMutation.isPending;

  // 화면에 보이는 사진 목록(서버 값 또는 보내는 중인 화면 값), 연속 조작이 렌더를 기다리지 않고 이어지게 ref로도 둠
  useEffect(() => {
    shownPhotosRef.current = draft?.photos ?? [];
  }, [draft?.photos]);

  const showPhotos = (photos: readonly DraftPhoto[]) => {
    shownPhotosRef.current = photos;
    setLocalPhotos(photos);
  };

  // 화면 사진을 서버의 번들 사진 ID로 바꿈(보내는 중에 새로 생긴 사진은 사진함 원본 ID로 찾음)
  const serverPhotoId = (photo: DraftPhoto) =>
    detailRef.current?.photos.find(
      (candidate) =>
        candidate.id === photo.id ||
        (photo.sourcePhotoId !== undefined && candidate.sourcePhotoId === photo.sourcePhotoId),
    )?.id;

  // 사진 변경 응답으로 최신 상세를 갱신, 이미 더 최신 revision이면 유지(제목·날짜 저장과 동시에 돌 수 있음)
  const adoptDetail = (next: BundleDetail) => {
    const current = detailRef.current;
    if (!current || next.revision >= current.revision) detailRef.current = next;
  };

  const applyPhotoChanges = async ({ add, remove }: { add: string[]; remove: string[] }) => {
    adoptDetail(
      await changePhotos.mutateAsync({
        addPhotoIds: add,
        removeBundlePhotoIds: remove,
        mode: detailRef.current?.status ?? 'DRAFT',
        idempotencyKey: createIdempotencyKey(),
      }),
    );
  };

  const applyPhotoMove = async ({ photoId, previous, next }: PhotoMovePlan) => {
    adoptDetail(
      await movePhotoMutation.mutateAsync({
        bundlePhotoId: photoId,
        previousBundlePhotoId: previous,
        nextBundlePhotoId: next,
        mode: detailRef.current?.status ?? 'DRAFT',
      }),
    );
  };

  // 한 번에 하나씩 보냄, 한 번 실패하면 남은 변경은 건너뛰고(서버와 어긋난 상태) 한 번만 안내하며 서버 값으로 되돌림
  const enqueuePhotoOp = (run: () => Promise<void>) => {
    photoOps.current += 1;
    setPhotoBusy(true);
    photoQueue.current = photoQueue.current
      .then(() => (photoFailed.current ? undefined : run()))
      .catch(() => {
        photoFailed.current = true;
        photoFailures.current += 1;
        toast(BUNDLE_MESSAGES.photosChangeFailed);
      })
      .finally(() => {
        photoOps.current -= 1;
        if (photoOps.current > 0) return;
        photoFailed.current = false;
        if (alive.current) {
          setLocalPhotos(undefined);
          setPhotoBusy(false);
        }
      });
  };

  const actions: DraftActions = {
    setTitle: (title) => {
      change((current) => ({ ...current, title }));
      setTyped((current) => ({ ...current, title }));
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
      setEditedLocations((current) => {
        const base = current ?? detailRef.current?.locations ?? NO_LOCATIONS;
        return base.length >= MAX_LOCATIONS ? base : [...base, { id: place.id, name: place.name }];
      }),
    removeLocation: (locationId) =>
      setEditedLocations((current) =>
        (current ?? detailRef.current?.locations ?? NO_LOCATIONS).filter(
          (location) => location.id !== locationId,
        ),
      ),
    moveLocation: (locationId, toIndex) =>
      setEditedLocations((current) =>
        moveLocation(current ?? detailRef.current?.locations ?? NO_LOCATIONS, locationId, toIndex),
      ),
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
    removePhoto: (photoId) => {
      const current = shownPhotosRef.current;
      const target = current.find((photo) => photo.id === photoId);
      const next = removePhoto(current, photoId);
      if (!target || next === current) return;
      showPhotos(next);
      enqueuePhotoOp(async () => {
        const serverId = serverPhotoId(target);
        if (serverId === undefined) throw new Error('photo is not on the server');
        await applyPhotoChanges({ add: [], remove: [serverId] });
      });
    },
    movePhoto: (photoId, toIndex) => {
      const current = shownPhotosRef.current;
      const next = movePhoto(current, photoId, toIndex);
      if (next.every((photo, index) => photo.id === current[index]?.id)) return;
      showPhotos(next);
      const index = next.findIndex((photo) => photo.id === photoId);
      const [moving, previous, following] = [next[index], next[index - 1], next[index + 1]];
      enqueuePhotoOp(async () => {
        const movingId = moving && serverPhotoId(moving);
        const previousId = previous && serverPhotoId(previous);
        const nextId = following && serverPhotoId(following);
        if (movingId === undefined || (previous && !previousId) || (following && !nextId)) {
          throw new Error('photo is not on the server');
        }
        await applyPhotoMove({
          photoId: movingId,
          previous: previousId ?? null,
          next: nextId ?? null,
        });
      });
    },
    replacePhotos: (photos) => {
      const current = shownPhotosRef.current;
      const currentIds = new Set(current.map((photo) => photo.id));
      const keptIds = new Set(photos.map((photo) => photo.id));
      const added = photos.filter((photo) => !currentIds.has(photo.id));
      const removed = current.filter((photo) => !keptIds.has(photo.id));
      showPhotos(photos);
      enqueuePhotoOp(async () => {
        const add = added.flatMap((photo) => (photo.sourcePhotoId ? [photo.sourcePhotoId] : []));
        const remove = removed.flatMap((photo) => serverPhotoId(photo) ?? []);
        if (add.length > 0 || remove.length > 0) await applyPhotoChanges({ add, remove });
        // 새 사진은 서버가 맨 뒤에 붙이므로, 고른 순서와 다르면 이동으로 맞춤
        const latest = detailRef.current;
        if (!latest) return;
        const desired = photos.flatMap((photo) => serverPhotoId(photo) ?? []);
        for (const plan of planPhotoMoves(
          latest.photos.map((photo) => photo.id),
          desired,
        )) {
          await applyPhotoMove(plan);
        }
      });
    },
    searchPlaces,
    publish: async () => {
      // 보내는 중인 사진 변경이 끝난 뒤의 서버 구성으로 발행함
      const failuresBefore = photoFailures.current;
      await photoQueue.current;
      if (photoFailures.current !== failuresBefore) {
        toast(BUNDLE_MESSAGES.photosChangeFailed);
        return 'blocked';
      }
      clearTimeout(timer.current);
      // 저장하지 못한 입력이 남아 있으면 발행하지 않음(서버는 저장된 내용만 발행함)
      // 진행 중이던 저장이 막 끝나는 순간 들어온 입력이 남을 수 있어 한 번 더 확인
      let saved = await flush();
      if (!saved) saved = await flush();
      if (!saved) {
        toast(BUNDLE_MESSAGES.saveFailed);
        return 'failed';
      }
      const latest = detailRef.current;
      if (!latest) return 'failed';
      setPublishing(true);
      try {
        await publishMutation.mutateAsync(latest.revision);
        setPublishedByMe(true);
        return 'published';
      } catch (error) {
        setPublishing(false);
        if (readPublishBlockers(error) !== undefined) {
          toast(BUNDLE_MESSAGES.uploadIncomplete);
          return 'blocked';
        }
        toast(
          // 충돌(BUNDLE_003)과 이미 발행됨·본문 불일치(BUNDLE_002)는 최신 내용을 확인하고 다시 해야 하는 같은 상황
          readVersionConflict(error) !== undefined ||
            errorCode(error) === 'BUNDLE_003' ||
            errorCode(error) === 'BUNDLE_002'
            ? BUNDLE_MESSAGES.publishConflict
            : BUNDLE_MESSAGES.publishFailed,
        );
        return 'failed';
      }
    },
  };

  // 기본 번치가 없거나 내가 그 번치 멤버가 아니면 이 초안을 볼 수 없어 없는 초안과 같은 안내로 이동
  const noAccess =
    (profile !== undefined && !profile.bunch) ||
    (bunchMembers !== undefined && profile !== undefined && viewer === undefined);
  const missing =
    bundleId === undefined ||
    noAccess ||
    (detailIsError && ['RESOURCE_001', 'AUTH_002'].includes(errorCode(detailError) ?? '')) ||
    (detail?.status === 'PUBLISHED' && !publishedByMe && !publishing);
  const failed =
    profileError || membersError || (detailIsError && !missing && detail === undefined);
  const retry = () => {
    if (profileError) void refetchProfile();
    if (membersError) void refetchMembers();
    if (detailIsError) void refetchDetail();
  };

  let state: DraftState = { kind: 'loading' };
  if (missing) {
    state = {
      kind: 'missing',
      reason:
        detail?.status === 'PUBLISHED' && !publishedByMe && !publishing ? 'published' : 'deleted',
    };
  } else if (failed) state = { kind: 'error', retry };
  else if (draft && viewer && !publishedByMe) {
    state = {
      kind: 'ready',
      draft,
      viewer,
      bunchMembers: members,
      saveStatus: stalled ? 'failed' : busy ? 'saving' : 'saved',
    };
  }

  return { state, actions };
}

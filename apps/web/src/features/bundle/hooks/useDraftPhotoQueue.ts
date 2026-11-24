'use client';
// 크기 유지: 빼기·이동·추가·끌기가 같은 대기열·화면 사진 목록·서버 id 매핑을 함께 씀

import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';
import type { DraftPhoto } from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import {
  type changeBundlePhotos,
  type moveBundlePhoto,
  type PhotoCapacityMode,
} from '../api/photos';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../constants/messages';
import { pickNewerDetail } from '../lib/draftMapping';
import { movePhoto, type PhotoMovePlan, planPhotoMoves, removePhoto } from '../lib/photos';

type ChangeInput = Omit<Parameters<typeof changeBundlePhotos>[0], 'bunchId' | 'bundleId'>;
type MoveInput = Omit<Parameters<typeof moveBundlePhoto>[0], 'bunchId' | 'bundleId'>;

export type ReplacePhotosOptions = {
  /**
   * 갤러리 가져오기: 고른 사진을 자르지 않고 모두 넘기면 받는 쪽이 남은 자리까지만 담음
   * 작성 화면은 서버가 정하고(`PARTIAL_ADD`, 화면 임시 목록만 20장으로 자름), 수정 화면은 20장에 맞춰 자름
   */
  partialAdd?: boolean | undefined;
  /**
   * 사용자가 더하려던 새 사진 수. 실제로 담긴 수가 이보다 적으면 담긴 장수를 한 번 안내함(기능명세서 4.3.14 로직 4). 없으면 안내하지 않음
   */
  requested?: number | undefined;
};

type Options = {
  /** 사진 요청의 기준이자 응답으로 갱신하는 최신 상세(자동 저장·발행과 함께 씀) */
  readDetail: () => BundleDetail | undefined;
  writeDetail: (_next: BundleDetail) => void;
  /** 지금 연결이 끊겼는지(렌더를 기다리지 않고 보내기 직전에 확인) */
  isOffline: () => boolean;
  refetchDetail: () => unknown;
  changePhotos: (_input: ChangeInput) => Promise<BundleDetail>;
  movePhoto: (_input: MoveInput) => Promise<BundleDetail>;
};

/**
 * 사진 빼기·이동·추가 대기열과 끌기 상태: 화면 값(`localPhotos`)을 먼저 보이고 서버에는 하나씩 순서대로 보냄
 * - 한 번 실패하면 남은 변경은 건너뛰고 한 번만 안내하며, 모두 끝나면 화면 값을 버리고 서버 값을 보임
 * - `settled()`로 모두 끝나길 기다리고(발행 전) 실패·건너뜀이 있었는지 받음, `discard()`는 아직 보내지 않은 변경을 버림
 */
export function useDraftPhotoQueue({
  readDetail,
  writeDetail,
  isOffline,
  refetchDetail,
  changePhotos,
  movePhoto: movePhotoRequest,
}: Options) {
  const [localPhotos, setLocalPhotos] = useState<readonly DraftPhoto[] | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // 사진을 끄는 중: 이벤트 보류 판단은 ref(이벤트가 올 때 읽음), 놓은 뒤 재조회는 state(effect)로 이어 감
  const dragRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  // 끌던 사진의 서버 id와, 그 끌기에서 이동 요청을 보냈는지(보냈다면 이동 응답 경로가 삭제 안내를 맡음)
  const draggedPhotoId = useRef<string | undefined>(undefined);
  const dragMoved = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // 연결이 끊길 때마다 올림: 그 전에 대기열에 넣었지만 아직 보내지 않은 사진 변경은 버림
  const discardGeneration = useRef(0);
  const ops = useRef(0);
  const failed = useRef(false);
  const failures = useRef(0);
  // 갤러리 부분 추가에서 정원에 막혀 서버에 담기지 않은 사진함 원본 id
  const rejectedSources = useRef(new Set<string>());
  const alive = useRef(true);
  // 화면에 보이는 사진 목록(서버 값 또는 보내는 중인 화면 값), 연속 조작이 렌더를 기다리지 않고 이어지게 ref로 둠
  const shownPhotosRef = useRef<readonly DraftPhoto[]>([]);
  const syncShown = useCallback((photos: readonly DraftPhoto[]) => {
    shownPhotosRef.current = photos;
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const showPhotos = (photos: readonly DraftPhoto[]) => {
    shownPhotosRef.current = photos;
    setLocalPhotos(photos);
  };

  // 화면 사진을 서버의 번들 사진 ID로 바꿈(보내는 중에 새로 생긴 사진은 사진함 원본 ID로 찾음)
  const serverPhotoId = (photo: DraftPhoto) =>
    readDetail()?.photos.find(
      (candidate) =>
        candidate.id === photo.id ||
        (photo.sourcePhotoId !== undefined && candidate.sourcePhotoId === photo.sourcePhotoId),
    )?.id;

  // 사진 변경 응답으로 최신 상세를 갱신, 이미 더 최신 revision이면 유지(제목·날짜 저장과 동시에 돌 수 있음)
  const adoptDetail = (next: BundleDetail) => {
    writeDetail(pickNewerDetail(readDetail(), next));
  };

  const applyPhotoChanges = async ({
    add,
    remove,
    capacityMode,
  }: {
    add: string[];
    remove: string[];
    capacityMode?: PhotoCapacityMode;
  }) => {
    const next = await changePhotos({
      addPhotoIds: add,
      removeBundlePhotoIds: remove,
      mode: readDetail()?.status ?? 'DRAFT',
      idempotencyKey: createIdempotencyKey(),
      ...(capacityMode && { capacityMode }),
    });
    adoptDetail(next);
    return next;
  };

  const applyPhotoMove = async ({ photoId, previous, next }: PhotoMovePlan) => {
    const moved = await movePhotoRequest({
      bundlePhotoId: photoId,
      previousBundlePhotoId: previous,
      nextBundlePhotoId: next,
      mode: readDetail()?.status ?? 'DRAFT',
    });
    adoptDetail(moved);
    return moved;
  };

  // 한 번에 하나씩 보냄, 한 번 실패하면 남은 변경은 건너뛰고(서버와 어긋난 상태) 한 번만 안내하며 서버 값으로 되돌림
  const enqueue = (run: (_discarded: () => boolean) => Promise<void>) => {
    ops.current += 1;
    setBusy(true);
    const generation = discardGeneration.current;
    queue.current = queue.current
      .then(async () => {
        if (failed.current) return;
        // 연결이 끊겨(아직 화면이 몰라도) 보내지 않고 건너뛴 변경인지: 한 번 건너뛰면 이어지는 단계도 건너뜀
        let dropped = false;
        const isDropped = () => {
          if (generation !== discardGeneration.current || isOffline()) dropped = true;
          return dropped;
        };
        if (!isDropped()) await run(isDropped);
        // 건너뛴 변경도 발행 전 확인이 알아챌 수 있게 실패 횟수에 셈(발행하면 사진 변경이 빠진 구성이 올라가므로, 안내는 발행 때 함)
        if (dropped) failures.current += 1;
      })
      .catch(() => {
        failed.current = true;
        failures.current += 1;
        toast(BUNDLE_MESSAGES.photosChangeFailed);
      })
      .finally(() => {
        ops.current -= 1;
        if (ops.current > 0) return;
        failed.current = false;
        if (alive.current) {
          setLocalPhotos(undefined);
          setBusy(false);
        }
      });
  };

  // 보류했던 이벤트 대신 받은 상세로 끌던 사진이 지워졌는지 확인
  const onResynced = useCallback((detail: BundleDetail | undefined) => {
    // 끌던 사진을 다른 멤버가 지웠는데 자리를 바꾸지 않고 놓은 경우에도 놓은 뒤 안내(이동 요청을 보냈다면 그 응답 경로가 안내함)
    const dropped = draggedPhotoId.current;
    draggedPhotoId.current = undefined;
    if (
      dropped !== undefined &&
      !dragMoved.current &&
      detail &&
      !detail.photos.some((photo) => photo.id === dropped)
    ) {
      toast(BUNDLE_MESSAGES.photoRemovedByOther);
    }
  }, []);

  const actions = {
    removePhoto: (photoId: string) => {
      const current = shownPhotosRef.current;
      const target = current.find((photo) => photo.id === photoId);
      const next = removePhoto(current, photoId);
      if (!target || next === current) return;
      showPhotos(next);
      enqueue(async () => {
        const serverId = serverPhotoId(target);
        // 갤러리 부분 추가에서 정원에 막혀 서버에 담기지 않은 사진은 빼는 동작이 이미 끝난 상태
        if (
          serverId === undefined &&
          target.sourcePhotoId &&
          rejectedSources.current.has(target.sourcePhotoId)
        )
          return;
        if (serverId === undefined) throw new Error('photo is not on the server');
        await applyPhotoChanges({ add: [], remove: [serverId] });
      });
    },
    movePhoto: (photoId: string, toIndex: number) => {
      const current = shownPhotosRef.current;
      const next = movePhoto(current, photoId, toIndex);
      if (next.every((photo, index) => photo.id === current[index]?.id)) return;
      // 끌기 중에 보낸 이동만 이 끌기의 이동으로 기록(끌기를 끝낸 뒤 앞·뒤로 버튼으로 옮긴 다른 이동은 아님)
      if (dragRef.current) dragMoved.current = true;
      showPhotos(next);
      const index = next.findIndex((photo) => photo.id === photoId);
      const [moving, previous, following] = [next[index], next[index - 1], next[index + 1]];
      enqueue(async () => {
        const movingId = moving && serverPhotoId(moving);
        const previousId = previous && serverPhotoId(previous);
        const nextId = following && serverPhotoId(following);
        if (movingId === undefined || (previous && !previousId) || (following && !nextId)) {
          throw new Error('photo is not on the server');
        }
        // 끄는 사이 다른 멤버가 지운 사진이면 서버는 변경 없이 응답하거나(삭제 확인) 알 수 없는 대상(404)으로 답함
        // 어느 쪽이든 그 사진은 사라진 것이라 손을 뗄 때 알리고, 보류했던 변경은 놓은 뒤 재조회로 맞춤
        const removedByOther = () => {
          toast(BUNDLE_MESSAGES.photoRemovedByOther);
          void refetchDetail();
        };
        try {
          const moved = await applyPhotoMove({
            photoId: movingId,
            previous: previousId ?? null,
            next: nextId ?? null,
          });
          if (!moved.photos.some((photo) => photo.id === movingId)) removedByOther();
        } catch (error) {
          // 404는 API 명세상 없는·삭제된 번들이나 사진이라 지운 사진으로 봄(삭제된 이웃 기준 사진은 서버가 위치를 보정해 404가 아님)
          if (isApiError(error) && error.status === 404) return removedByOther();
          throw error;
        }
      });
    },
    /** `heldEvent`: 보류한 실시간 이벤트가 있는지(놓은 뒤 재조회가 끌던 사진을 확인할지 정함) */
    setPhotoDragging: (isDragging: boolean, photoId: string | undefined, heldEvent: boolean) => {
      dragRef.current = isDragging;
      setDragging(isDragging);
      if (isDragging) {
        dragMoved.current = false;
        const photo =
          photoId === undefined
            ? undefined
            : shownPhotosRef.current.find((candidate) => candidate.id === photoId);
        draggedPhotoId.current = photo && serverPhotoId(photo);
      } else if (!heldEvent) {
        // 끄는 동안 사진 변경 이벤트가 없었으면 놓은 뒤 확인할 것이 없음(낡은 id가 나중의 재조회에서 안내를 만들지 않게 비움)
        draggedPhotoId.current = undefined;
      }
    },
    replacePhotos: (photos: readonly DraftPhoto[], options?: ReplacePhotosOptions) => {
      const current = shownPhotosRef.current;
      const currentIds = new Set(current.map((photo) => photo.id));
      const keptIds = new Set(photos.map((photo) => photo.id));
      const added = photos.filter((photo) => !currentIds.has(photo.id));
      const removed = current.filter((photo) => !keptIds.has(photo.id));
      // 갤러리 가져오기는 고른 사진을 모두 서버에 보내 서버가 남은 자리만큼 담게 하고, 화면 임시 목록만 20장으로 자름(기능명세서 4.3.14 로직 4)
      const partialAdd = options?.partialAdd === true && removed.length === 0;
      showPhotos(partialAdd ? photos.slice(0, MAX_PHOTOS) : photos);
      enqueue(async (discarded) => {
        const add = added.flatMap((photo) => (photo.sourcePhotoId ? [photo.sourcePhotoId] : []));
        const remove = removed.flatMap((photo) => serverPhotoId(photo) ?? []);
        // 다시 담으려는 원본은 예전 거절 기록을 지우고 이번 결과로 정함
        for (const id of add) rejectedSources.current.delete(id);
        if (add.length > 0 || remove.length > 0) {
          const next = await applyPhotoChanges({
            add,
            remove,
            ...(partialAdd && { capacityMode: 'PARTIAL_ADD' as const }),
          });
          if (partialAdd) {
            // 서버가 확정한 이번 요청의 추가 결과를 정본으로 셈(다른 멤버가 같은 원본을 먼저 담은 경우와 구분). 결과가 없으면 응답 구성으로 셈
            const onServer = new Set(next.photos.flatMap((photo) => photo.sourcePhotoId ?? []));
            const addedIds = next.photoChangeResult
              ? new Set(next.photoChangeResult.addedPhotoIds)
              : new Set(add.filter((id) => onServer.has(id)));
            // 정원에 막혀 담기지 않은 사진: 그 사진을 빼는 동작은 이미 끝난 것으로 봄(뒤이은 변경이 막히지 않게)
            // 이번에 담긴 원본은 예전에 거절된 기록을 지움(다시 담긴 사진을 빼면 서버에도 보내야 함)
            for (const id of add) {
              if (addedIds.has(id)) rejectedSources.current.delete(id);
              else rejectedSources.current.add(id);
            }
            // 고른 장수를 받은 경우에만 안내(찾지 못한 사진이 있어 다른 안내를 띄운 경우는 받지 않음)
            const wanted = options?.requested;
            if (wanted !== undefined && addedIds.size < wanted) {
              toast(BUNDLE_MESSAGES.photosAddedUpTo(addedIds.size));
            }
            // 서버가 새 사진을 맨 뒤에 붙이고 기존 사진 순서는 서버 값을 따름(옛 화면 순서로 기존 사진을 옮기지 않음)
            return;
          }
        }
        // 요청을 기다리는 사이 연결이 끊겨 폐기됐으면 이어지는 이동 요청은 보내지 않음
        if (discarded()) return;
        // 새 사진은 서버가 맨 뒤에 붙이므로, 고른 순서와 다르면 이동으로 맞춤
        const latest = readDetail();
        if (!latest) return;
        const desired = photos.flatMap((photo) => serverPhotoId(photo) ?? []);
        for (const plan of planPhotoMoves(
          latest.photos.map((photo) => photo.id),
          desired,
        )) {
          if (discarded()) return;
          await applyPhotoMove(plan);
        }
      });
    },
  };

  return {
    localPhotos,
    /** 보내는 중이거나 기다리는 사진 변경이 있음 */
    busy,
    dragging,
    actions,
    onResynced,
    /** 렌더된 사진 목록을 연속 조작의 기준으로 맞춤(렌더 뒤 effect에서 부름) */
    syncShown,
    /** 지금 사진 이벤트를 보류해야 하는지(내 요청 진행 중이거나 끄는 중) */
    holdsEvents: () => ops.current > 0 || dragRef.current,
    /** 대기열이 모두 끝나길 기다림. 그 사이 실패하거나 건너뛴 변경이 있었으면 failed */
    settled: async () => {
      const before = failures.current;
      await queue.current;
      return { failed: failures.current !== before };
    },
    discard: () => {
      discardGeneration.current += 1;
      setLocalPhotos(undefined);
    },
  };
}

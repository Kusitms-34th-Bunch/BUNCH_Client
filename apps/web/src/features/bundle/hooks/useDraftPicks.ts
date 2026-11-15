'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { Draft } from '../lib/types';
import type { PhotoPicks } from '../model/bundle';
import { readPickConflict, saveBundlePhotoPick } from '../api/bundles';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { pickersOf, withPick } from '../lib/picks';
import { usePhotoPickCache } from '../queries/photoPicks';

// 버전 충돌을 서버의 현재 픽으로 맞추고 같은 희망 상태를 다시 보내는 최대 횟수(그 뒤에도 어긋나면 실패로 봄)
const MAX_CONFLICT_RETRIES = 2;

const errorStatus = (error: unknown) => (error as { status?: number } | null)?.status;

/**
 * 픽 화면의 픽 저장(기능 spec 4.3.5): 누르면 내 화면을 먼저 바꾸고, 서버에는 「원하는 최종 상태」를 보내 저장
 * - 사진마다 요청을 하나씩만 보내고, 응답을 기다리는 사이 또 누르면 마지막 상태 하나만 이어서 보냄(연타는 마지막 상태만 저장)
 * - 서버가 버전 충돌(BUNDLE_003)로 돌려준 현재 픽으로 맞춘 뒤 원하는 상태가 다르면 다시 보냄
 * - 저장하지 못하면 화면을 원래대로 돌리고 오류 토스트
 * - 다른 멤버의 픽은 이벤트가 없어, 픽 화면에 들어올 때 최신 상세를 다시 받아 맞춤(`synced`가 그 완료)
 * 서버 픽은 상세의 `draft.picks`이고, 저장 결과는 상세 캐시의 사진 픽에 바로 반영
 */
export function useDraftPicks(
  draft: Draft | undefined,
  memberId: string | undefined,
  /** 연결이 끊겨 편집을 막는 동안: 눌러도 반응하지 않음(기능 spec 4.3.14) */
  blocked: boolean,
) {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const bundleId = draft?.id;

  // 내가 누른 뒤 서버가 아직 확인하지 않은 희망 상태(사진 id → 픽 여부). 렌더용 복사본과 저장 루프가 읽는 ref
  const [wanted, setWanted] = useState<Readonly<Record<string, boolean>>>({});
  const wantedRef = useRef(new Map<string, boolean>());
  const inflight = useRef(new Set<string>());
  const alive = useRef(true);
  const blockedRef = useRef(blocked);
  useEffect(() => {
    blockedRef.current = blocked;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const cache = usePhotoPickCache(bunchId, bundleId);

  // 픽 화면에 들어올 때마다 최신 픽과 사진 목록을 받음(다른 멤버의 픽은 이벤트가 없음). 받고 나면(실패해도) synced
  // 진행 중인 재조회가 있으면 취소하지 않고 그 결과를 함께 받음
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!bunchId || !bundleId) return;
    void cache.refetch().finally(() => {
      if (alive.current) setSynced(true);
    });
  }, [cache, bunchId, bundleId]);

  const syncWanted = useCallback(() => {
    if (alive.current) setWanted(Object.fromEntries(wantedRef.current));
  }, []);

  const settle = useCallback(
    (photoId: string) => {
      wantedRef.current.delete(photoId);
      syncWanted();
    },
    [syncWanted],
  );

  // 화면을 떠나도 이미 누른 픽은 끝까지 저장한다(실패하면 안내도 띄움). 다시 들어오면 재조회로 서버 값에 맞춤
  const flush = useCallback(
    async (photoId: string) => {
      if (!bunchId || !bundleId || inflight.current.has(photoId)) return;
      inflight.current.add(photoId);
      let conflicts = 0;
      // 이 루프가 마지막으로 받은 서버 픽(저장 응답·충돌 detail). 캐시가 낡은 값으로 보이더라도 이 값 기준으로 끝낼 수 있음
      let latest: PhotoPicks | undefined;
      try {
        for (;;) {
          const want = wantedRef.current.get(photoId);
          if (want === undefined) return;
          const photo = cache.readPhoto(photoId);
          // 그사이 사진이 번들에서 빠짐: 보던 사진 안내는 목록이 바뀔 때 화면이 띄움
          if (!photo) return settle(photoId);
          const known = latest ?? photo.picks ?? { version: 0, pickedByMe: false, memberIds: [] };
          if (known.pickedByMe === want) return settle(photoId);
          try {
            const saved = await saveBundlePhotoPick({
              bunchId,
              bundleId,
              bundlePhotoId: photoId,
              picked: want,
              expectedVersion: known.version,
            });
            latest = saved;
            cache.writePicks(photoId, saved);
            // 서버가 원하는 상태와 다른 값을 성공으로 돌려주면 같은 요청을 반복하지 않고 실패로 봄
            if (saved.pickedByMe !== want && wantedRef.current.get(photoId) === want) {
              settle(photoId);
              toast(BUNDLE_MESSAGES.pickFailed);
              return;
            }
          } catch (error) {
            const current = readPickConflict(error);
            if (current && conflicts < MAX_CONFLICT_RETRIES) {
              conflicts += 1;
              latest = current;
              cache.writePicks(photoId, current);
              continue;
            }
            settle(photoId);
            const status = errorStatus(error);
            const code = (error as { code?: string } | null)?.code;
            // 사진이 없어졌거나(404) 이미 발행됨(BUNDLE_002): 최신 상세로 맞추고, 안내는 화면이 목록·상태 변화로 띄움
            if (status === 404 || code === 'BUNDLE_002') {
              void cache.refetch();
            } else {
              // 권한이 바뀌었거나(403) 충돌 값을 읽지 못한 경우는 최신 상세로 맞추고 알림
              if (status === 403 || code === 'BUNDLE_003') {
                void cache.refetch();
              }
              toast(BUNDLE_MESSAGES.pickFailed);
            }
            return;
          }
        }
      } finally {
        inflight.current.delete(photoId);
      }
    },
    [bunchId, bundleId, cache, settle],
  );

  const toggle = useCallback(
    (photoId: string) => {
      if (!draft || memberId === undefined || !bunchId || blockedRef.current) return;
      const shown =
        wantedRef.current.get(photoId) ?? pickersOf(draft.picks, photoId).includes(memberId);
      wantedRef.current.set(photoId, !shown);
      syncWanted();
      void flush(photoId);
    },
    [draft, memberId, bunchId, syncWanted, flush],
  );

  const picks = useMemo(() => {
    if (!draft) return {};
    if (memberId === undefined) return draft.picks;
    return Object.entries(wanted).reduce(
      (current, [photoId, picked]) => withPick(current, photoId, memberId, picked),
      draft.picks,
    );
  }, [draft, memberId, wanted]);

  return { picks, toggle, synced };
}

/** 이 사진을 번들 멤버가 픽했는지(나간 멤버의 픽은 세지 않음). 사진을 지울 때 「픽도 함께 삭제」 안내에 씀 */
export function useIsPhotoPicked(draft: Draft) {
  return useCallback(
    (photoId: string) =>
      pickersOf(draft.picks, photoId).some((memberId) =>
        draft.members.some((member) => member.id === memberId),
      ),
    [draft.picks, draft.members],
  );
}

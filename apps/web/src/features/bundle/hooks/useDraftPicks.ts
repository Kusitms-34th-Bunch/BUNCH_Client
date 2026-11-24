'use client';

import { toast } from '@app/design-system';
import { notifyManager, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { apiErrorCode, apiErrorStatus } from '@/shared/api/client/errorStatus';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { Draft, DraftPhoto } from '../lib/types';
import type { PhotoPicks } from '../model/bundle';
import { readPickConflict, saveBundlePhotoPick } from '../api/photoPicks';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { toDraft } from '../lib/draftMapping';
import { pickIntents } from '../lib/pickIntents';
import { pickersOf, withPick, type Picks } from '../lib/picks';
import { usePhotoPickCache } from '../queries/photoPicks';

/** 픽 화면에 들어올 때 받은 최신 상세의 사진과 사진별 픽(화면이 이 값으로 고정함) */
export type PickEntry = { photos: readonly DraftPhoto[]; picks: Picks };

// 버전 충돌을 서버의 현재 픽으로 맞추고 같은 희망 상태를 다시 보내는 최대 횟수(그 뒤에도 어긋나면 실패로 봄)
const MAX_CONFLICT_RETRIES = 2;

const NO_INTENTS: Readonly<Record<string, boolean>> = {};

/**
 * 픽 화면의 픽 저장(기능 spec 4.3.5): 누르면 내 화면을 먼저 바꾸고, 서버에는 「원하는 최종 상태」를 보내 저장
 * - 사진마다 요청을 하나씩만 보내고, 응답을 기다리는 사이 또 누르면 마지막 상태 하나만 이어서 보냄(연타는 마지막 상태만 저장)
 * - 서버가 버전 충돌(BUNDLE_003)로 돌려준 현재 픽으로 맞춘 뒤 원하는 상태가 다르면 다시 보냄
 * - 저장하지 못하면 화면을 원래대로 돌리고 오류 토스트
 * - 다른 멤버의 픽은 이벤트가 없어, 픽 화면에 들어올 때 최신 상세를 다시 받아 맞춤(`entry`가 그 결과의 사진·픽)
 * - 보낼 희망 상태와 진행 중인 저장은 화면 밖(`pickIntents`)에서 번들·사진별로 하나씩만 둬서, 나갔다 다시 들어와도 루프가 겹치지 않음
 * 서버 픽은 상세의 `draft.picks`이고, 저장 결과는 상세 캐시의 사진 픽에 바로 반영
 */
export function useDraftPicks(
  draft: Draft | undefined,
  memberId: string | undefined,
  /** 연결이 끊겨 편집을 막는 동안: 눌러도 반응하지 않음(기능 spec 4.3.14) */
  blocked: boolean,
  /** 누른 사진이 서버에 없다고 확인됐을 때(404): 화면이 「삭제된 사진이에요」 안내를 띄움 */
  onPhotoGone?: (_photoId: string) => void,
) {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const bundleId = draft?.id;

  // 내가 누른 뒤 서버가 아직 확인하지 않은 희망 상태(사진 id → 픽 여부): 이 번들 것만 골라 씀
  const allIntents = useSyncExternalStore(
    pickIntents.subscribe,
    pickIntents.getSnapshot,
    () => NO_INTENTS,
  );
  const wanted = useMemo(() => {
    const prefix = `${bundleId}:`;
    return Object.fromEntries(
      Object.entries(allIntents)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, picked]) => [key.slice(prefix.length), picked]),
    );
  }, [allIntents, bundleId]);
  const alive = useRef(true);
  const blockedRef = useRef(blocked);
  const goneRef = useRef(onPhotoGone);
  useEffect(() => {
    blockedRef.current = blocked;
    goneRef.current = onPhotoGone;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const cache = usePhotoPickCache(bunchId, bundleId);

  // 픽 화면에 들어올 때마다 최신 픽과 사진 목록을 받음(다른 멤버의 픽은 이벤트가 없음)
  // 진행 중인 재조회가 있으면 취소하지 않고 그 결과를 함께 받음
  // 받고 나면(실패해도) 그때 캐시의 상세로 `entry`를 만듦. 화면의 draft가 다시 만들어지는 시점에 기대지 않고 캐시에서 바로 읽음
  const [entry, setEntry] = useState<PickEntry | undefined>(undefined);
  useEffect(() => {
    if (!bunchId || !bundleId) return;
    void cache.refetch().finally(() => {
      const detail = cache.readDetail();
      if (!alive.current || !detail) return;
      // 멤버·위치는 쓰지 않아 비워 둠(사진과 픽만 가져옴)
      const { photos, picks } = toDraft({ detail, bunchMembers: [], locations: [] });
      setEntry({ photos, picks });
    });
  }, [cache, bunchId, bundleId]);

  // 희망 상태는 방금 캐시에 쓴 서버 값이 화면의 초안(query 구독)에 닿은 뒤에 지움
  // 캐시 쓰기는 구독자에게 다음 차례에 알리고 희망 상태 지우기는 바로 반영돼, 바로 지우면 한 번은 둘 다 없는 옛 픽이 보임(픽하기 모션이 꺼졌다 처음부터 다시 켜짐)
  // 지우기 전에 다시 눌러 희망 상태가 바뀌었으면 남김
  const settle = useCallback(
    (photoId: string) => {
      if (!bundleId) return;
      const settled = pickIntents.get(bundleId, photoId);
      notifyManager.schedule(() => pickIntents.clearIf(bundleId, photoId, settled));
    },
    [bundleId],
  );

  // 화면을 떠나도 이미 누른 픽은 끝까지 저장한다(실패하면 안내도 띄움). 다시 들어오면 재조회로 서버 값에 맞춤
  const flush = useCallback(
    async (photoId: string) => {
      if (!bunchId || !bundleId || !pickIntents.begin(bundleId, photoId)) return;
      let conflicts = 0;
      // 이 루프가 마지막으로 받은 서버 픽(저장 응답·충돌 detail). 캐시가 낡은 값으로 보이더라도 이 값 기준으로 끝낼 수 있음
      let latest: PhotoPicks | undefined;
      try {
        for (;;) {
          const want = pickIntents.get(bundleId, photoId);
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
            if (saved.pickedByMe !== want && pickIntents.get(bundleId, photoId) === want) {
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
            const status = apiErrorStatus(error);
            const code = apiErrorCode(error);
            // 사진이 없어졌거나(404): 최신 상세로 맞추고, 누른 사진이라 화면이 바로 삭제 안내를 띄움
            // 이미 발행됨(BUNDLE_002): 최신 상세로 맞춤(안내는 화면이 발행 상태 변화로 띄움)
            if (status === 404 || code === 'BUNDLE_002') {
              void cache.refetch();
              if (status === 404 && alive.current) goneRef.current?.(photoId);
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
        pickIntents.end(bundleId, photoId);
      }
    },
    [bunchId, bundleId, cache, settle],
  );

  const toggle = useCallback(
    (photoId: string) => {
      if (!draft || memberId === undefined || !bunchId || blockedRef.current) return;
      const shown =
        pickIntents.get(draft.id, photoId) ?? pickersOf(draft.picks, photoId).includes(memberId);
      pickIntents.set(draft.id, photoId, !shown);
      void flush(photoId);
    },
    [draft, memberId, bunchId, flush],
  );

  const picks = useMemo(() => {
    if (!draft) return {};
    if (memberId === undefined) return draft.picks;
    return Object.entries(wanted).reduce(
      (current, [photoId, picked]) => withPick(current, photoId, memberId, picked),
      draft.picks,
    );
  }, [draft, memberId, wanted]);

  return { picks, toggle, entry };
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

'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import type { DraftPhoto } from '@/features/bundle/lib/types';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '@/features/bundle/constants/messages';
import { toDraftPhoto } from '@/features/bundle/lib/photoAdd';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { usePhotoUpload } from '@/features/photo-box/hooks/usePhotoUpload';
import { MAX_PHOTOS_IN_BOX } from '@/features/photo-box/lib/photoActions';
import { useInvalidatePhotosOf } from '@/features/photo-box/queries/photos';

// 올린 사진이 사진함 목록에 안 보이면(목록 조회 실패·반영 지연) 이 간격으로 목록을 다시 받고, 이 횟수까지 받아도 없으면 포기함
const LIST_RETRY_MS = 1500;
const LIST_MAX_ATTEMPTS = 3;

type PendingAttach = {
  /** 사진함에 올라가 번들에 붙일 사진 id(고른 순서) */
  ids: readonly string[];
  /** 목록을 다시 받을 번치(올리기를 시작한 번치) */
  bunchId: string;
  /** 지금까지 목록을 다시 받은 횟수 */
  attempts: number;
  /** 목록을 다시 받는 중 */
  refreshing: boolean;
};

type UsePhotoGalleryImportOptions = {
  /** 올릴 사진함의 번치(없으면 올릴 곳이 없음) */
  bunchId: string | undefined;
  /** 사진함 전체 목록: 가득 찼는지 확인하고, 올린 사진이 목록에 들어오면 그 사진으로 번들 사진을 만듦 */
  boxPhotos: readonly PhotoBoxPhoto[];
  /** 지금 번들 사진 */
  photos: readonly DraftPhoto[];
  /** 번들 사진을 이 구성으로 바꿈(작성 화면·수정 화면 공통). 연결이 끊겨 적용하지 못하면 false를 돌려줌(작성 화면) */
  replacePhotos: (
    _photos: readonly DraftPhoto[],
    _options?: { partialAdd?: boolean | undefined; requested?: number | undefined },
  ) => boolean | void;
  /** 사진함을 몰라 가져올 수 없을 때(사진함 조회 실패 등). 사진함을 다시 받아 다음 시도부터 가져올 수 있게 함 */
  onUnavailable?: (() => void) | undefined;
};

/**
 * 번들 사진 추가 시트의 「내 갤러리에서 가져오기」(기능 spec 4.3.7)
 * 번들과 사진함 feature를 직접 잇지 않으려고 route 층에서 조합함(작성·수정 route 공통)
 * 사진함 올리기(`usePhotoUpload`)와 같은 규칙으로 고른 사진을 사진함에 올리고, 사진함에 들어간 사진을 번들 맨 뒤에 붙임
 * - 고를 수 있는 장수는 「20 − 지금 장수」, 사진함이 가득 차면 선택창을 열지 않고 「사진함이 가득 찼어요.」만 띄움
 * - 일부 실패는 사진함 올리기와 같은 결과 토스트(「다시 시도」 없음), 모두 올라가면 토스트 없이 칸에 사진이 들어옴
 * - 선택창이 열려 있는 동안과 올라가는 동안 `importing`이 값을 가짐(선택창 동안 0, 고른 뒤 고른 장수): 화면이 칸 로딩과 「사진」 작업 중 표시에 씀
 * - 이미 번들에 있는 사진과 20장을 넘는 사진은 붙이지 않음
 */
export function usePhotoGalleryImport({
  bunchId,
  boxPhotos,
  photos,
  replacePhotos,
  onUnavailable,
}: UsePhotoGalleryImportOptions) {
  const { start } = usePhotoUpload(bunchId);
  const invalidatePhotosOf = useInvalidatePhotosOf();
  const [importing, setImporting] = useState<number | undefined>(undefined);
  // 올린 사진을 번들에 붙이기를 기다리는 중: 목록에 다 보이면 바로 붙이고, 안 보이면 목록을 몇 번 더 받은 뒤 있는 것만 붙임
  const [pending, setPending] = useState<PendingAttach | undefined>(undefined);
  const running = useRef(false);
  const mounted = useRef(true);
  // 올리는 동안 바뀐 번들 사진과 동작을 붙일 때의 값으로 씀
  const latest = useRef({ photos, replacePhotos });
  useEffect(() => {
    latest.current = { photos, replacePhotos };
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const finish = () => {
    running.current = false;
    if (!mounted.current) return;
    setPending(undefined);
    setImporting(undefined);
  };

  // 사진함 목록을 다시 받음. 조회가 실패해도 횟수만 세고 다음 시도로 넘어감(올린 사진 id는 그대로 보존)
  const refreshList = usePreservedCallback((targetBunchId: string) => {
    setPending((current) => current && { ...current, refreshing: true });
    void invalidatePhotosOf(targetBunchId)
      .catch(() => undefined)
      .then(() => {
        if (!mounted.current) return;
        setPending(
          (current) => current && { ...current, refreshing: false, attempts: current.attempts + 1 },
        );
      });
  });

  useEffect(() => {
    if (!pending) return;
    const byId = new Map(boxPhotos.map((photo) => [photo.id, photo]));
    const sources = pending.ids.flatMap((id) => byId.get(id) ?? []);
    const missing = sources.length < pending.ids.length;
    if (missing && pending.attempts < LIST_MAX_ATTEMPTS) {
      // 받는 중이면 받은 뒤에 다시 확인하고, 아니면 목록을 다시 받음(처음은 바로, 그다음부터는 간격을 두고)
      if (pending.refreshing) return;
      const timer = setTimeout(
        () => refreshList(pending.bunchId),
        pending.attempts === 0 ? 0 : LIST_RETRY_MS,
      );
      return () => clearTimeout(timer);
    }
    // 목록을 여러 번 받아도 끝내 찾지 못한 사진은 번들에 붙이지 못하므로 알림(사진함에는 올라가 있음)
    if (missing) toast(BUNDLE_MESSAGES.photosChangeFailed);
    const { photos: current, replacePhotos: replace } = latest.current;
    const linked = new Set(current.flatMap((photo) => photo.sourcePhotoId ?? []));
    const room = Math.max(0, MAX_PHOTOS - current.length);
    const candidates = sources.filter((source) => !linked.has(source.id));
    const added = candidates.slice(0, room).map(toDraftPhoto);
    // 올리는 사이 다른 멤버가 자리를 다 채웠으면 붙이지 않고 알림. 일부만 들어가면 담긴 장수 안내는 결과를 아는 쪽(작성·수정 화면)이 한 번만 함(기능명세서 4.3.14 로직 4)
    if (added.length === 0) {
      if (candidates.length > 0) toast(BUNDLE_MESSAGES.photosAddedUpTo(0));
    } else if (
      replace([...current, ...added], { partialAdd: true, requested: candidates.length }) === false
    ) {
      // 사진함에는 올라갔는데 번들에는 붙이지 못했으면(연결 끊김) 알림
      toast(BUNDLE_MESSAGES.photosChangeFailed);
    }
    finish();
  }, [pending, boxPhotos, refreshList]);

  const importFromGallery = (maxCount: number) => {
    // 이미 가져오는 중이면 선택창을 다시 열지 않고 올라가는 중이라고 알림
    if (running.current) {
      toast(PHOTO_BOX_MESSAGES.uploading);
      return;
    }
    if (maxCount <= 0) return;
    // 사진함을 아직 받지 못했거나 받지 못한 상태면 올릴 곳을 몰라 안내하고 사진함을 다시 받음(선택창을 열지 않음)
    // 올릴 사진함을 모르면 그 사진함이 가득 찼는지도 의미가 없어 용량 확인보다 먼저 봄
    if (!bunchId) {
      toast(PHOTO_BOX_MESSAGES.uploadFailed);
      onUnavailable?.();
      return;
    }
    if (boxPhotos.length >= MAX_PHOTOS_IN_BOX) {
      toast(PHOTO_BOX_MESSAGES.photoBoxFull);
      return;
    }
    running.current = true;
    setImporting(0);
    void (async () => {
      try {
        const result = await start('album', {
          limit: maxCount,
          retry: false,
          failuresOnly: true,
          onPicked: (count) => {
            if (mounted.current) setImporting(count);
          },
        });
        if (result.photoIds.length === 0) {
          finish();
          return;
        }
        // 목록에 들어오는 대로 붙이고, 안 보이면 effect가 목록을 다시 받음
        if (mounted.current) {
          setPending({ ids: result.photoIds, bunchId, attempts: 0, refreshing: false });
        } else running.current = false;
      } catch {
        toast(PHOTO_BOX_MESSAGES.uploadFailed);
        finish();
      }
    })();
  };

  return { importFromGallery, importing };
}

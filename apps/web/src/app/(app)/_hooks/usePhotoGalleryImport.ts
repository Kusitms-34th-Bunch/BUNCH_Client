'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import type { DraftPhoto } from '@/features/bundle/lib/types';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '@/features/bundle/constants/messages';
import { toDraftPhoto } from '@/features/bundle/lib/photoAdd';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { usePhotoUpload } from '@/features/photo-box/hooks/usePhotoUpload';
import { MAX_PHOTOS_IN_BOX } from '@/features/photo-box/lib/photoActions';
import { useInvalidatePhotosOf } from '@/features/photo-box/queries/photos';

// 새로 올린 사진이 사진함 목록에 들어오기를 기다리는 최대 시간(목록을 다시 받은 뒤에도 화면에 반영되기까지의 여유)
const LIST_SETTLE_WAIT_MS = 1500;

type UsePhotoGalleryImportOptions = {
  /** 올릴 사진함의 번치(없으면 올릴 곳이 없음) */
  bunchId: string | undefined;
  /** 사진함 전체 목록: 가득 찼는지 확인하고, 올린 사진이 목록에 들어오면 그 사진으로 번들 사진을 만듦 */
  boxPhotos: readonly PhotoBoxPhoto[];
  /** 지금 번들 사진 */
  photos: readonly DraftPhoto[];
  /** 번들 사진을 이 구성으로 바꿈(작성 화면·수정 화면 공통). 연결이 끊겨 적용하지 못하면 false를 돌려줌(작성 화면) */
  replacePhotos: (_photos: readonly DraftPhoto[]) => boolean | void;
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
}: UsePhotoGalleryImportOptions) {
  const { start } = usePhotoUpload(bunchId);
  const invalidatePhotosOf = useInvalidatePhotosOf();
  const [importing, setImporting] = useState<number | undefined>(undefined);
  // 올린 사진을 번들에 붙이기를 기다리는 중: 목록을 받은 뒤에도 아직 없으면 잠깐 더 기다렸다가 있는 것만 붙임
  const [pending, setPending] = useState<
    { ids: readonly string[]; refreshed: boolean; gaveUp: boolean } | undefined
  >(undefined);
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

  useEffect(() => {
    if (!pending) return;
    const byId = new Map(boxPhotos.map((photo) => [photo.id, photo]));
    const sources = pending.ids.flatMap((id) => byId.get(id) ?? []);
    if (sources.length < pending.ids.length && !pending.gaveUp) {
      // 목록을 받는 중이면 받은 뒤에 다시 확인함
      if (!pending.refreshed) return;
      const timer = setTimeout(
        () => setPending((current) => current && { ...current, gaveUp: true }),
        LIST_SETTLE_WAIT_MS,
      );
      return () => clearTimeout(timer);
    }
    // 사진함 목록에서 끝내 찾지 못한 사진은 번들에 붙이지 못하므로 알림(사진함에는 올라가 있음)
    if (sources.length < pending.ids.length) toast(BUNDLE_MESSAGES.photosChangeFailed);
    const { photos: current, replacePhotos: replace } = latest.current;
    const linked = new Set(current.flatMap((photo) => photo.sourcePhotoId ?? []));
    const room = Math.max(0, MAX_PHOTOS - current.length);
    const added = sources
      .filter((source) => !linked.has(source.id))
      .slice(0, room)
      .map(toDraftPhoto);
    // 사진함에는 올라갔는데 번들에는 붙이지 못했으면(연결 끊김) 알림
    if (added.length > 0 && replace([...current, ...added]) === false) {
      toast(BUNDLE_MESSAGES.photosChangeFailed);
    }
    finish();
  }, [pending, boxPhotos]);

  const importFromGallery = (maxCount: number) => {
    // 이미 가져오는 중이면 선택창을 다시 열지 않고 올라가는 중이라고 알림
    if (running.current) {
      toast(PHOTO_BOX_MESSAGES.uploading);
      return;
    }
    if (boxPhotos.length >= MAX_PHOTOS_IN_BOX) {
      toast(PHOTO_BOX_MESSAGES.photoBoxFull);
      return;
    }
    if (maxCount <= 0) return;
    // 사진함을 아직 받지 못했거나 받지 못한 상태면 올릴 곳을 몰라 안내(선택창을 열지 않음)
    if (!bunchId) {
      toast(PHOTO_BOX_MESSAGES.uploadFailed);
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
        if (result.photoIds.length === 0 || !bunchId) {
          finish();
          return;
        }
        if (mounted.current) setPending({ ids: result.photoIds, refreshed: false, gaveUp: false });
        // 새 사진이 사진함 목록에 들어올 때까지 목록을 다시 받음
        await invalidatePhotosOf(bunchId);
        if (mounted.current) {
          setPending((current) => current && { ...current, refreshed: true });
        }
      } catch {
        // 올라간 사진을 번들에 붙이지 못했을 수 있어 알림
        toast(BUNDLE_MESSAGES.photosChangeFailed);
        finish();
      }
    })();
  };

  return { importFromGallery, importing };
}

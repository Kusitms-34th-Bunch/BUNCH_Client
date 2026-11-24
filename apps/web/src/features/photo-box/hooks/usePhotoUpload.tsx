'use client';
// 크기 유지: 묶음 올리기·결과 알림·다시 시도가 같은 목록 갱신 예약과 상태 줄을 씀(한 장 전송은 lib/uploadItem)

import type { PickPhotosResult } from '@app/bridge';
import { toast } from '@app/design-system';
import { useEffect, useRef } from 'react';
import { isNativeShell, photoUploadBridge } from '@/shared/bridge/client';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { CameraPermissionDialog } from '../components/PhotoUploadDialogs';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import {
  createUploadBatchId,
  runPool,
  summarizeUpload,
  UPLOAD_CONCURRENCY,
  UPLOAD_LIST_REFRESH_MS,
  uploadResultMessage,
} from '../lib/photoUpload';
import {
  attemptUpload,
  readPhoto,
  skipPhoto,
  type UploadItem,
  type UploadResult,
} from '../lib/uploadItem';
import { isPageVisible, uploadStatusStore } from '../lib/uploadStatus';
import { useInvalidatePhotosOf } from '../queries/photos';

// 페이지가 보이면 바로, 숨어 있으면 다시 보일 때 한 번 실행
const whenPageVisible = (run: () => void) => {
  if (isPageVisible()) {
    run();
    return;
  }
  const onChange = () => {
    if (!isPageVisible()) return;
    document.removeEventListener('visibilitychange', onChange);
    run();
  };
  document.addEventListener('visibilitychange', onChange);
};

export type UploadSource = 'album' | 'camera';

/** 번들 작성 화면의 「내 갤러리에서 가져오기」처럼 사진함 올리기를 다른 흐름에서 쓸 때의 옵션 */
export type UploadStartOptions = {
  /** 선택창에서 고를 수 있는 최대 장수(기본은 쉘 기본값 50장) */
  limit?: number | undefined;
  /** false면 결과 토스트에 「다시 시도」를 붙이지 않음(기본 true, 기능 spec 4.3.7) */
  retry?: boolean | undefined;
  /** true면 올리지 못한 사진이 있을 때만 결과 토스트를 띄움(올라간 사진은 번들에 바로 보이므로 성공 안내가 필요 없음) */
  failuresOnly?: boolean | undefined;
  /** 사진을 고른 직후(올리기 전)에 고른 장수를 알림 */
  onPicked?: ((_count: number) => void) | undefined;
  /**
   * true면 진행과 결과를 사진함 상단 업로드 상태 줄(`uploadStatusStore`)로 보이고, 결과 토스트는 「다시 시도」할 사진이 있을 때만 띄움
   * 사진함 화면에서 올릴 때만 씀(번들 작성 화면에는 상태 줄이 없음)
   */
  statusLine?: boolean | undefined;
};

/**
 * 한 번 올리기의 결과
 * - `unavailable`: 쉘이 없거나 이전 쉘이라 올리지 못함(안내는 띄움), `failed`: 선택창을 열지 못함, `canceled`: 고르지 않음·권한 거부
 * - `done`: 올렸음. `photoIds`는 사진함에 들어간 사진(새로 저장·합쳐짐·내가 이미 올린 같은 사진)의 id를 고른 순서대로, `failed`는 올리지 못한 수
 */
export type UploadStartResult = {
  status: 'unavailable' | 'failed' | 'canceled' | 'done';
  photoIds: string[];
  failed: number;
};

const nothingUploaded = (status: UploadStartResult['status']): UploadStartResult => ({
  status,
  photoIds: [],
  failed: 0,
});

type FinishOptions = Pick<UploadStartOptions, 'retry' | 'failuresOnly' | 'statusLine'>;

type UploadBatch<Source> = {
  targetBunchId: string;
  uploadBatchId: string;
  /** 진행을 기록할 상태 줄의 번치(기록하지 않으면 없음) */
  statusBunchId: string | undefined;
  sources: readonly Source[];
  /** 보낼 파일로 준비함. 읽지 못하면 null */
  load: (_source: Source) => Promise<UploadItem | null>;
  /** 한도 오류 뒤 보내지 않는 사진의 정리 */
  skip?: ((_source: Source) => Promise<unknown>) | undefined;
  /** 「다시 시도」 묶음: 받아 둔 파일을 그대로 보내 받기 단계가 없음 */
  retried: boolean;
};

/**
 * 사진 올리기(기능명세서 3.2.2·3.2.3): 시트에서 고른 방식으로 쉘의 선택·촬영을 열고, 고른 사진을 한 장씩 가공해 받아 올림
 * - 대상 번치는 올리기를 시작한 시점의 번치로 고정(올리는 중에 번치를 바꿔도 원래 번치에 저장)
 * - 올리는 도중에도 새로 올라간 사진은 `UPLOAD_LIST_REFRESH_MS` 간격으로 목록에 반영함(기능명세서 3.2.2 「다 올라간 사진부터 목록에 들어온다」)
 * - 올리는 중에는 중간 토스트 없이, 끝나면 결과 토스트 하나만 띄움. 네트워크 실패·일시 장애가 있으면 「다시 시도」를 붙임
 *   `statusLine`이면 진행·결과를 사진함 상단 업로드 상태 줄로 보이고, 토스트는 「다시 시도」가 필요하거나 상태 줄을 보는 화면이 없을 때만 띄움
 *   화면을 막는 로딩은 없어 올리는 중에도 사진함을 보거나 다른 화면으로 갈 수 있음
 * - 쉘이 없는 브라우저와 새 bridge 메서드가 없는 이전 쉘에서는 안내만 하고 올리지 않음
 * - 올리는 중에도 다시 올릴 수 있어 묶음이 겹치면 동시 요청이 `UPLOAD_CONCURRENCY`를 넘을 수 있음
 *   결과 토스트는 묶음별로 띄우고, 상태 줄은 같은 번치의 묶음을 한 줄로 합쳐 모두 끝나면 합친 결과를 보임
 */
export function usePhotoUpload(bunchId: string | undefined) {
  const invalidatePhotosOf = useInvalidatePhotosOf();
  const openOverlay = useScreenOverlay();
  // 선택·촬영 창을 기다리는 사이 화면이 떠났으면 권한 안내 창을 열지 않음(떠난 화면의 창이 남지 않게)
  const mounted = useMountedRef();
  // 번치마다 한 번만 걸어 두는 목록 갱신 예약(올리는 도중 새로 올라간 사진을 반영함)
  const refreshTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = refreshTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // 새로 올라간 사진이 있으면 그 번치의 목록 갱신을 예약함. 이미 예약돼 있으면 그 갱신에 함께 반영됨
  const scheduleListRefresh = (targetBunchId: string) => {
    const timers = refreshTimers.current;
    if (timers.has(targetBunchId)) return;
    timers.set(
      targetBunchId,
      setTimeout(() => {
        timers.delete(targetBunchId);
        void invalidatePhotosOf(targetBunchId);
      }, UPLOAD_LIST_REFRESH_MS),
    );
  };

  /**
   * 사진 묶음 하나를 최대 `UPLOAD_CONCURRENCY`장씩 동시에 올리고 결과를 고른 순서대로 돌려줌
   * 상태 줄 번치가 있으면 시작·사진별 결과·끝을 기록함
   */
  const runUploadBatch = async <Source,>({
    targetBunchId,
    uploadBatchId,
    statusBunchId,
    sources,
    load,
    skip,
    retried,
  }: UploadBatch<Source>): Promise<UploadResult[]> => {
    if (statusBunchId !== undefined) uploadStatusStore.begin(statusBunchId, sources.length);
    // `read`면 받을 때 채운 반 칸을 뺀 나머지만 채움. 다시 시도는 받기 단계가 없어 한 칸을 다 채움
    const report = (result: UploadResult, read: boolean) => {
      if (statusBunchId !== undefined)
        uploadStatusStore.advance(statusBunchId, result.outcome, read);
      return result;
    };
    // 한도 오류를 받으면 남은 사진은 읽지도 보내지도 않고 「올리지 못한 사진」으로 셈(어차피 거절되므로)
    let limitReached = false;
    try {
      return await runPool(sources, UPLOAD_CONCURRENCY, async (source): Promise<UploadResult> => {
        if (limitReached) {
          await skip?.(source);
          return report({ outcome: 'failed' }, false);
        }
        const item = await load(source);
        // 사진을 읽지 못한 것도 「올리지 못한 사진」으로만 셈(다시 시도 대상 아님)
        if (!item) return report({ outcome: 'failed' }, false);
        if (statusBunchId !== undefined) {
          // 쉘 사진은 받은 순간 반 칸을 채우고, 둘 다 처음 받은·보내는 사진을 썸네일로 씀
          if (retried) uploadStatusStore.setThumbnail(statusBunchId, item.image);
          else uploadStatusStore.markRead(statusBunchId, item.image);
        }
        const result = await attemptUpload(targetBunchId, uploadBatchId, item);
        if (result.outcome === 'failed' && result.limited) limitReached = true;
        if (result.outcome === 'added') scheduleListRefresh(targetBunchId);
        // 다시 시도 대상은 응답이 끊겨 서버 저장 여부를 몰랐던 사진이라, 이미 있다고 나오면 방금 올라간 것으로 셈
        return report(
          retried && result.outcome === 'skipped' ? { ...result, outcome: 'added' } : result,
          !retried,
        );
      });
    } finally {
      if (statusBunchId !== undefined) uploadStatusStore.end(statusBunchId);
    }
  };

  // 결과 토스트의 「다시 시도」: 네트워크 실패만 같은 묶음 ID로 다시 올리고 이 사진들의 결과를 다시 알림
  const retryFailed = async (
    targetBunchId: string,
    uploadBatchId: string,
    retryItems: UploadItem[],
    options: FinishOptions,
  ) => {
    const results = await runUploadBatch({
      targetBunchId,
      uploadBatchId,
      statusBunchId: options.statusLine ? targetBunchId : undefined,
      sources: retryItems,
      load: (item) => Promise.resolve(item),
      retried: true,
    });
    finish(targetBunchId, uploadBatchId, results, options);
  };

  // 한 묶음의 결과를 집계해 토스트를 띄우고, 새로 들어간 사진이 있으면 그 번치의 사진 목록을 다시 받음
  const finish = (
    targetBunchId: string,
    uploadBatchId: string,
    results: UploadResult[],
    options: FinishOptions = {},
  ) => {
    const summary = summarizeUpload(results.map((result) => result.outcome));
    // 끝나면 아래에서 한 번 더 받으므로 예약해 둔 갱신은 걷음
    clearTimeout(refreshTimers.current.get(targetBunchId));
    refreshTimers.current.delete(targetBunchId);
    // 응답을 받기 전에 끊긴 사진(다시 시도 대상)과 결과를 알 수 없는 실패(코드 없는 5xx 등)도 서버에는 저장됐을 수 있어 목록을 다시 받음
    if (
      summary.added > 0 ||
      summary.retryable > 0 ||
      results.some((result) => result.outcome === 'failed' && result.unknown)
    ) {
      void invalidatePhotosOf(targetBunchId);
    }
    const retryItems = results.flatMap((result) =>
      result.outcome === 'failed-retryable' ? [result.retryItem] : [],
    );
    const message = uploadResultMessage(summary);
    // 올린 사진이 없으면 알릴 것이 없음
    if (message === null) return;
    if (options.failuresOnly && summary.failed === 0) return;
    const canRetry = retryItems.length > 0 && options.retry !== false;
    const showResult = () =>
      toast(
        message,
        canRetry
          ? {
              action: {
                label: PHOTO_BOX_MESSAGES.uploadRetry,
                onClick: () => void retryFailed(targetBunchId, uploadBatchId, retryItems, options),
              },
            }
          : undefined,
      );
    if (!options.statusLine) {
      showResult();
      return;
    }
    // 앱은 탭마다 WebView가 따로라, 다른 탭에 가 있으면(사진함 WebView가 숨음) 상태 줄도 토스트도 보이지 않음
    // 그래서 판단을 사진함이 다시 보일 때로 미룸(숨은 사이 다른 탭에서 번치를 바꿔 보는 번치가 달라졌을 수 있음)
    whenPageVisible(() => {
      // 상태 줄이 결과를 보이므로 토스트는 「다시 시도」 버튼이 필요할 때만 띄움(상태 줄에는 버튼 자리가 없음)
      // 사진 상세·다른 번치 등으로 가 있어 이 번치의 상태 줄을 보는 화면이 없으면 결과를 놓치지 않게 토스트로 알림
      if (!canRetry && uploadStatusStore.isWatched(targetBunchId)) return;
      // 토스트로 결과를 봤으므로 상태 줄의 유지 시간도 이때부터 셈
      uploadStatusStore.markShown(targetBunchId);
      showResult();
    });
  };

  const showCameraPermissionDialog = () => {
    if (!mounted.current) return;
    openOverlay((rootProps, close) => (
      <CameraPermissionDialog
        {...rootProps}
        onOpenSettings={() => {
          // 설정 앱에서 돌아왔을 때 「거부되어 있어요」 안내가 그대로 남지 않도록 닫고 이동
          close();
          void photoUploadBridge.openAppSettings().catch(() => undefined);
        }}
      />
    ));
  };

  const pick = (source: UploadSource, limit?: number): Promise<PickPhotosResult> => {
    if (source === 'camera') return photoUploadBridge.capturePhoto();
    return limit === undefined
      ? photoUploadBridge.pickGalleryImages()
      : photoUploadBridge.pickGalleryImages({ limit });
  };

  const start = async (
    source: UploadSource,
    options: UploadStartOptions = {},
  ): Promise<UploadStartResult> => {
    // 번치를 아직 모르면(화면이 준비되기 전) 올릴 곳이 없음
    if (!bunchId) return nothingUploaded('unavailable');
    const targetBunchId = bunchId;
    if (!isNativeShell()) {
      toast(PHOTO_BOX_MESSAGES.uploadUnavailable);
      return nothingUploaded('unavailable');
    }
    const method = source === 'album' ? 'pickGalleryImages' : 'capturePhoto';
    if (!photoUploadBridge.isNativeMethodAvailable(method)) {
      toast(PHOTO_BOX_MESSAGES.uploadNeedsUpdate);
      return nothingUploaded('unavailable');
    }

    let picked: PickPhotosResult;
    try {
      picked = await pick(source, options.limit);
    } catch {
      toast(PHOTO_BOX_MESSAGES.uploadFailed);
      return nothingUploaded('failed');
    }
    if (picked.status === 'canceled') return nothingUploaded('canceled');
    if (picked.status === 'denied') {
      // 안내 문구가 카메라 권한이므로 카메라에서만 열고, 앨범에서 거부가 오면(계약상 없음) 일반 오류로 알림
      if (source === 'camera') showCameraPermissionDialog();
      else toast(PHOTO_BOX_MESSAGES.uploadFailed);
      return nothingUploaded('canceled');
    }
    options.onPicked?.(picked.photos.length);

    const uploadBatchId = createUploadBatchId();
    // 상태 줄을 쓰면 사진을 받을 때와 결과가 나올 때 진행을 기록함(빈 선택은 알릴 것이 없어 시작하지 않음)
    const results = await runUploadBatch({
      targetBunchId,
      uploadBatchId,
      statusBunchId: options.statusLine && picked.photos.length > 0 ? targetBunchId : undefined,
      sources: picked.photos,
      load: readPhoto,
      skip: skipPhoto,
      retried: false,
    });
    finish(targetBunchId, uploadBatchId, results, options);
    return {
      status: 'done',
      // 같은 원본을 두 번 골랐으면 서버가 같은 사진 id를 두 번 줄 수 있어 처음 나온 순서대로 한 번만 담음
      photoIds: [
        ...new Set(
          results.flatMap((result) =>
            result.outcome === 'added' || result.outcome === 'skipped' ? [result.photoId] : [],
          ),
        ),
      ],
      failed: results.filter((result) => result.outcome.startsWith('failed')).length,
    };
  };

  return { start };
}

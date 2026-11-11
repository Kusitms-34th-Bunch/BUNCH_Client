'use client';

import type { PickedPhoto, PickPhotosResult } from '@app/bridge';
import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { isNativeShell, photoUploadBridge } from '@/shared/bridge/client';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { dataUrlToBlob } from '@/shared/lib/dataUrl';
import { uploadPhoto } from '../api/photoUpload';
import { CameraPermissionDialog } from '../components/PhotoUploadDialogs';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import {
  createUploadBatchId,
  isRetryableUploadError,
  isUploadableJpeg,
  isUploadLimitError,
  runPool,
  summarizeUpload,
  UPLOAD_CONCURRENCY,
  uploadResultMessage,
  type UploadOutcome,
} from '../lib/photoUpload';
import { useInvalidatePhotosOf } from '../queries/photos';

export type UploadSource = 'album' | 'camera';

/** 업로드할 사진 한 장: 쉘이 가공한 JPEG와 촬영 날짜·시각. 실패한 사진의 「다시 시도」는 이 값을 그대로 다시 보냄 */
type UploadItem = {
  image: Blob;
  capturedDate?: string | undefined;
  capturedTime?: string | undefined;
};

type UploadResult = {
  outcome: UploadOutcome;
  retryItem?: UploadItem;
  /** 사진함 한도 오류(하루·한 번에 올릴 수 있는 수)라 같은 묶음의 남은 사진도 거절됨 */
  limited?: boolean;
};

const attempt = async (
  bunchId: string,
  uploadBatchId: string,
  item: UploadItem,
): Promise<UploadResult> => {
  try {
    const { result } = await uploadPhoto({ bunchId, uploadBatchId, ...item });
    // 내가 이미 올린 같은 사진은 서버가 변경 없이 제외하므로 추가한 사진으로 세지 않음
    return { outcome: result === 'ALREADY_UPLOADED' ? 'skipped' : 'added' };
  } catch (error) {
    return isRetryableUploadError(error)
      ? { outcome: 'failed-retryable', retryItem: item }
      : { outcome: 'failed', limited: isUploadLimitError(error) };
  }
};

// 보내지 않기로 한 사진도 쉘이 들고 있지 않도록 놓아 줌
const skipPhoto = (photo: PickedPhoto) =>
  photoUploadBridge.releasePickedPhotos([photo.id]).catch(() => undefined);

// 쉘에서 사진 한 장을 읽어 오고 바로 놓아 줌(쉘이 캐시의 원본 복사본을 지움). 실패한 사진의 재시도는 여기서 받은 이미지로 하므로 놓아 줘도 됨
// 쉘이 준 이미지도 보내기 전에 한 번 더 확인함(비어 있거나 JPEG가 아니거나 배포처 본문 제한을 넘으면 보내지 않고 「올리지 못한 사진」으로 셈)
const readPhoto = async (photo: PickedPhoto): Promise<UploadItem | null> => {
  try {
    const { dataUrl } = await photoUploadBridge.readPickedPhoto(photo.id);
    const image = dataUrlToBlob(dataUrl);
    if (!(await isUploadableJpeg(image))) return null;
    return {
      image,
      ...(photo.capturedDate ? { capturedDate: photo.capturedDate } : {}),
      ...(photo.capturedTime ? { capturedTime: photo.capturedTime } : {}),
    };
  } catch {
    return null;
  } finally {
    await photoUploadBridge.releasePickedPhotos([photo.id]).catch(() => undefined);
  }
};

/**
 * 사진 올리기(기능명세서 3.2.2·3.2.3): 시트에서 고른 방식으로 쉘의 선택·촬영을 열고, 고른 사진을 한 장씩 가공해 받아 올림
 * - 대상 번치는 올리기를 시작한 시점의 번치로 고정(올리는 중에 번치를 바꿔도 원래 번치에 저장)
 * - 올리는 중에는 중간 토스트 없이, 끝나면 결과 토스트 하나만 띄움. 네트워크 실패·일시 장애가 있으면 「다시 시도」를 붙임
 *   `uploading`을 돌려줘 화면이 전체 로딩과 화면 밖 안내(live region)를 보이게 함
 * - 쉘이 없는 브라우저와 새 bridge 메서드가 없는 이전 쉘에서는 안내만 하고 올리지 않음
 * - 올리는 중에는 화면이 inert라 다시 올릴 수 없지만, 훅 자체는 겹쳐 불려도 묶음별로 동작함(동시 요청이 `UPLOAD_CONCURRENCY`를 넘을 수 있음)
 */
export function usePhotoUpload(bunchId: string | undefined) {
  const invalidatePhotosOf = useInvalidatePhotosOf();
  const openOverlay = useScreenOverlay();
  const [uploadingCount, setUploadingCount] = useState(0);
  // 선택·촬영 창을 기다리는 사이 화면이 떠났으면 권한 안내 창을 열지 않음(떠난 화면의 창이 남지 않게)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 올리는 중인 묶음 수를 셈(여러 번 올리기가 겹칠 수 있음)
  const track = async <Result,>(work: () => Promise<Result>): Promise<Result> => {
    setUploadingCount((count) => count + 1);
    try {
      return await work();
    } finally {
      setUploadingCount((count) => count - 1);
    }
  };

  // 한 묶음의 결과를 집계해 토스트를 띄우고, 새로 들어간 사진이 있으면 그 번치의 사진 목록을 다시 받음
  const finish = (targetBunchId: string, uploadBatchId: string, results: UploadResult[]) => {
    const summary = summarizeUpload(results.map((result) => result.outcome));
    // 응답을 받기 전에 끊긴 사진(다시 시도 대상)도 서버에는 저장됐을 수 있어 목록을 다시 받음
    if (summary.added > 0 || summary.retryable > 0) {
      void invalidatePhotosOf(targetBunchId);
    }
    const retryItems = results.flatMap((result) => (result.retryItem ? [result.retryItem] : []));
    const message = uploadResultMessage(summary);
    // 올린 사진이 없으면 알릴 것이 없음
    if (message === null) return;
    toast(
      message,
      retryItems.length > 0
        ? {
            action: {
              label: PHOTO_BOX_MESSAGES.uploadRetry,
              // 못 올린 사진 중 네트워크 실패만 같은 묶음 ID로 다시 올리고, 끝나면 이 사진들의 결과 토스트를 다시 띄움
              onClick: () => {
                // 다시 시도에서도 한도 오류를 받으면 남은 사진은 보내지 않음
                let limitReached = false;
                void track(() =>
                  runPool(retryItems, UPLOAD_CONCURRENCY, async (item): Promise<UploadResult> => {
                    if (limitReached) return { outcome: 'failed' };
                    const result = await attempt(targetBunchId, uploadBatchId, item);
                    if (result.limited) limitReached = true;
                    return result;
                  }),
                ).then((retried) =>
                  // 다시 시도 대상은 응답이 끊겨 서버 저장 여부를 몰랐던 사진이라, 이번에 이미 있다고 나오면 방금 올라간 것으로 셈
                  finish(
                    targetBunchId,
                    uploadBatchId,
                    retried.map((result) =>
                      result.outcome === 'skipped' ? { ...result, outcome: 'added' } : result,
                    ),
                  ),
                );
              },
            },
          }
        : undefined,
    );
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

  const pick = (source: UploadSource): Promise<PickPhotosResult> =>
    source === 'album' ? photoUploadBridge.pickGalleryImages() : photoUploadBridge.capturePhoto();

  const start = async (source: UploadSource) => {
    // 번치를 아직 모르면(화면이 준비되기 전) 올릴 곳이 없음
    if (!bunchId) return;
    const targetBunchId = bunchId;
    if (!isNativeShell()) {
      toast(PHOTO_BOX_MESSAGES.uploadUnavailable);
      return;
    }
    const method = source === 'album' ? 'pickGalleryImages' : 'capturePhoto';
    if (!photoUploadBridge.isNativeMethodAvailable(method)) {
      toast(PHOTO_BOX_MESSAGES.uploadNeedsUpdate);
      return;
    }

    let picked: PickPhotosResult;
    try {
      picked = await pick(source);
    } catch {
      toast(PHOTO_BOX_MESSAGES.uploadFailed);
      return;
    }
    if (picked.status === 'canceled') return;
    if (picked.status === 'denied') {
      // 안내 문구가 카메라 권한이므로 카메라에서만 열고, 앨범에서 거부가 오면(계약상 없음) 일반 오류로 알림
      if (source === 'camera') showCameraPermissionDialog();
      else toast(PHOTO_BOX_MESSAGES.uploadFailed);
      return;
    }

    const uploadBatchId = createUploadBatchId();
    // 한도 오류를 받으면 남은 사진은 읽지도 보내지도 않고 「올리지 못한 사진」으로 셈(어차피 거절되므로)
    let limitReached = false;
    const results = await track(() =>
      runPool(picked.photos, UPLOAD_CONCURRENCY, async (photo): Promise<UploadResult> => {
        if (limitReached) {
          await skipPhoto(photo);
          return { outcome: 'failed' };
        }
        const item = await readPhoto(photo);
        // 사진을 읽지 못한 것도 「올리지 못한 사진」으로만 셈(다시 시도 대상 아님)
        if (!item) return { outcome: 'failed' };
        const result = await attempt(targetBunchId, uploadBatchId, item);
        if (result.limited) limitReached = true;
        return result;
      }),
    );
    finish(targetBunchId, uploadBatchId, results);
  };

  return { start, uploading: uploadingCount > 0 };
}

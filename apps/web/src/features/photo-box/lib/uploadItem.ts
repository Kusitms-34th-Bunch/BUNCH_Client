import type { PhotoSourceType, PickedPhoto } from '@app/bridge';
import { toDomainId } from '@/shared/api/client/ids';
import { photoUploadBridge } from '@/shared/bridge/client';
import { dataUrlToBlob } from '@/shared/lib/image/dataUrl';
import { uploadPhoto } from '../api/photoUpload';
import {
  isRetryableUploadError,
  isUploadableJpeg,
  isUploadLimitError,
  isUploadOutcomeUnknown,
} from './photoUpload';

/** 업로드할 사진 한 장: 쉘이 가공한 JPEG와 촬영 날짜·시각. 실패한 사진의 「다시 시도」는 이 값을 그대로 다시 보냄 */
export type UploadItem = {
  image: Blob;
  capturedDate?: string | undefined;
  capturedTime?: string | undefined;
  /** 쉘이 원본 EXIF에서 뽑은 촬영 시각의 UTC 오프셋과 원본 유형(이전 쉘은 없음). 「다시 시도」도 같은 값을 보냄 */
  capturedUtcOffset?: string | undefined;
  sourceType?: PhotoSourceType | undefined;
  /** 쉘이 가공 전 원본 파일로 계산한 SHA-256. 「다시 시도」도 같은 값을 보냄 */
  originalFileHash?: string | undefined;
};

export type UploadResult =
  /** 사진함에 들어간 사진(새로 저장·합쳐짐·내가 이미 올린 같은 사진)과 그 id */
  | { outcome: 'added' | 'skipped'; photoId: string }
  | { outcome: 'failed-retryable'; retryItem: UploadItem }
  | {
      outcome: 'failed';
      /** 사진함 한도 오류(하루·한 번에 올릴 수 있는 수)라 같은 묶음의 남은 사진도 거절됨 */
      limited?: boolean;
      /** 서버에 저장됐는지 알 수 없는 실패(코드 없는 5xx, 성공 응답을 읽지 못함)라 목록을 다시 받아야 함 */
      unknown?: boolean;
    };

export const attemptUpload = async (
  bunchId: string,
  uploadBatchId: string,
  item: UploadItem,
): Promise<UploadResult> => {
  try {
    const { photoId, result } = await uploadPhoto({ bunchId, uploadBatchId, ...item });
    // 내가 이미 올린 같은 사진은 서버가 변경 없이 제외하므로 추가한 사진으로 세지 않음
    return {
      outcome: result === 'ALREADY_UPLOADED' ? 'skipped' : 'added',
      photoId: toDomainId(photoId),
    };
  } catch (error) {
    return isRetryableUploadError(error)
      ? { outcome: 'failed-retryable', retryItem: item }
      : {
          outcome: 'failed',
          limited: isUploadLimitError(error),
          unknown: isUploadOutcomeUnknown(error),
        };
  }
};

/** 보내지 않기로 한 사진도 쉘이 들고 있지 않도록 놓아 줌 */
export const skipPhoto = (photo: PickedPhoto) =>
  photoUploadBridge.releasePickedPhotos([photo.id]).catch(() => undefined);

// 쉘에서 사진 한 장을 읽어 오고 바로 놓아 줌(쉘이 캐시의 원본 복사본을 지움). 실패한 사진의 재시도는 여기서 받은 이미지로 하므로 놓아 줘도 됨
// 쉘이 준 이미지도 보내기 전에 한 번 더 확인함(비어 있거나 JPEG가 아니거나 배포처 본문 제한을 넘으면 보내지 않고 「올리지 못한 사진」으로 셈)
export const readPhoto = async (photo: PickedPhoto): Promise<UploadItem | null> => {
  try {
    const { dataUrl, originalFileHash } = await photoUploadBridge.readPickedPhoto(photo.id);
    const image = dataUrlToBlob(dataUrl);
    if (!(await isUploadableJpeg(image))) return null;
    return {
      image,
      ...(photo.capturedDate ? { capturedDate: photo.capturedDate } : {}),
      ...(photo.capturedTime ? { capturedTime: photo.capturedTime } : {}),
      ...(photo.capturedUtcOffset ? { capturedUtcOffset: photo.capturedUtcOffset } : {}),
      ...(photo.sourceType ? { sourceType: photo.sourceType } : {}),
      ...(originalFileHash ? { originalFileHash } : {}),
    };
  } catch {
    return null;
  } finally {
    await photoUploadBridge.releasePickedPhotos([photo.id]).catch(() => undefined);
  }
};

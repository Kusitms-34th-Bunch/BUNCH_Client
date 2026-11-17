import { normalizeError } from '@app/api-core';
import { PHOTO_SOURCE_TYPES, type PhotoSourceType } from '@app/bridge';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { photoUploadResponseSchema } from '../model/photos';

// 쉘이 준 값이라도 서버가 거절할 값(형식·범위 밖)은 필드를 빼고 올림(한 필드 때문에 사진 업로드가 실패하지 않게 함)
const isUtcOffset = (value: string) => {
  const match = /^([+-])(\d{2}):([0-5]\d)$/.exec(value);
  if (!match) return false;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  const signed = match[1] === '-' ? -minutes : minutes;
  return signed >= -12 * 60 && signed <= 14 * 60;
};
const isSourceType = (value: string): value is PhotoSourceType =>
  (PHOTO_SOURCE_TYPES as readonly string[]).includes(value);

/** 사진 1장을 올리는 요청의 제한 시간. 모바일 네트워크에서 수 MB를 보내므로 기본보다 길게 둠 */
const UPLOAD_TIMEOUT_MS = 60_000;

export type UploadPhotoInput = {
  bunchId: string;
  /** 쉘이 가공한 JPEG(긴 변 2560px 이하, 위치를 포함한 메타데이터 없음) */
  image: Blob;
  /** 사진 선택창에서 한 번 고른 사진들이 모두 같은 값. 「다시 시도」로 다시 올려도 원래 값을 유지 */
  uploadBatchId: string;
  /** 촬영 현지 날짜(yyyy-MM-dd). 없으면 날짜 미확인 사진이 됨 */
  capturedDate?: string | undefined;
  /** 촬영 현지 시각(HH:mm:ss). 날짜 없이 보낼 수 없음 */
  capturedTime?: string | undefined;
  /** 촬영 시각의 UTC 오프셋(`+09:00`). 모르면 보내지 않음(서버는 한국 시간으로 봄) */
  capturedUtcOffset?: string | undefined;
  /** 원본 유형. 쉘이 원본 EXIF로 분류한 값이고, 이전 쉘은 보내지 않음(서버에는 값 없음으로 저장됨) */
  sourceType?: PhotoSourceType | undefined;
  /** 가공 전 원본 파일의 SHA-256(소문자 hex 64자). 서버가 같은 원본 사진을 판별하는 데 씀. 없으면 보내지 않음 */
  originalFileHash?: string | undefined;
  signal?: AbortSignal | undefined;
};

/**
 * 사진 업로드: 사진 1장당 요청 1건, multipart로 `photo`(JPEG 파일)와 `uploadBatchId`·`capturedDate`·`capturedTime`·`originalFileHash`를 각각 별도 필드로 보냄
 * 서버는 Swagger와 달리 `request` JSON 파트가 아니라 필드를 따로 받고 `capturedTime`은 `HH:mm:ss` 문자열이며, 실서버 개발 환경에서 확인함
 * 재시도는 처음 만든 파일을 그대로 다시 보내야 함(다시 압축하면 서버가 다른 사진으로 판별)
 * 실패는 `ApiError`로 던짐: 형식·용량 `COMMON_001`, 번치 소속 아님 `AUTH_002`, 한도 `PHOTO_001`(1,000장)·`PHOTO_002`(오늘 100장)·`PHOTO_003`(한 번에 50장), 일시 장애 `PHOTO_007`
 */
export const uploadPhoto = async ({
  bunchId,
  image,
  uploadBatchId,
  capturedDate,
  capturedTime,
  capturedUtcOffset,
  sourceType,
  originalFileHash,
  signal,
}: UploadPhotoInput) => {
  try {
    const body = new FormData();
    // 파일 이름이 있는 File로 보냄(서버가 업로드 파일로 인식)
    body.append('photo', new File([image], 'photo.jpg', { type: 'image/jpeg' }));
    body.append('uploadBatchId', uploadBatchId);
    if (capturedDate) body.append('capturedDate', capturedDate);
    // 날짜 없이 시각만 보내면 서버가 거절하므로 날짜가 있을 때만 보냄
    if (capturedDate && capturedTime) body.append('capturedTime', capturedTime);
    // 쉘이 원본 EXIF에서 뽑은 값이라 가공한 JPEG에서는 서버가 읽을 수 없음(서버 PR #153). 오프셋은 모르면 생략하고, 유형은 판단하지 못하면 UNKNOWN으로 보냄
    if (capturedUtcOffset && isUtcOffset(capturedUtcOffset)) {
      body.append('capturedUtcOffset', capturedUtcOffset);
    }
    if (sourceType && isSourceType(sourceType)) body.append('sourceType', sourceType);
    if (originalFileHash) body.append('originalFileHash', originalFileHash);
    return await requestData(
      bffApi.post(`bunches/${encodeURIComponent(bunchId)}/photos`, {
        body,
        timeout: UPLOAD_TIMEOUT_MS,
        signal: signal ?? null,
      }),
      photoUploadResponseSchema,
      'photo upload',
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

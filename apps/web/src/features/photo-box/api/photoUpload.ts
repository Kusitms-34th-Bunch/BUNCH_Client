import { normalizeError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { photoUploadResponseSchema } from '../model/photos';

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
  signal?: AbortSignal | undefined;
};

/**
 * 사진 업로드: 사진 1장당 요청 1건, multipart로 `photo`(JPEG 파일)와 `request`(JSON 파트)를 보냄(가입 프로필과 같은 방식)
 * 요청 모양(JSON 파트 여부, `capturedTime` 형식)은 백엔드 확정 전이라 Swagger 기준이고, 바뀌면 이 함수 한 곳만 고침
 * 재시도는 처음 만든 파일을 그대로 다시 보내야 함(다시 압축하면 서버가 다른 사진으로 판별)
 * 실패는 `ApiError`로 던짐: 형식·용량 `COMMON_001`, 번치 소속 아님 `AUTH_002`, 한도 `PHOTO_001`(1,000장)·`PHOTO_002`(오늘 100장)·`PHOTO_003`(한 번에 50장), 일시 장애 `PHOTO_007`
 */
export const uploadPhoto = async ({
  bunchId,
  image,
  uploadBatchId,
  capturedDate,
  capturedTime,
  signal,
}: UploadPhotoInput) => {
  try {
    const request = {
      uploadBatchId,
      ...(capturedDate ? { capturedDate } : {}),
      // 날짜 없이 시각만 보내면 서버가 거절하므로 날짜가 있을 때만 보냄
      ...(capturedDate && capturedTime ? { capturedTime } : {}),
    };
    const body = new FormData();
    body.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    // 파일 이름이 있는 File로 보냄(서버가 업로드 파일로 인식)
    body.append('photo', new File([image], 'photo.jpg', { type: 'image/jpeg' }));
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

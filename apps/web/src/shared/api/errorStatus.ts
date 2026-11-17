import { isApiError } from '@app/api-core';

// 화면이 여러 곳에서 같은 기준으로 쓰는 오류 판정(status 묶음을 화면마다 다시 적지 않게)

/**
 * 볼 대상이 없거나 볼 수 없음: 없음·삭제(404), 권한 없음(403), 잘못된 주소(400)
 * 다시 시도로 풀리지 않아 「볼 수 없음」 안내로 보냄. 그 밖의 실패는 다시 시도 대상
 */
export const isUnavailableTarget = (error: unknown) =>
  isApiError(error) && (error.status === 400 || error.status === 403 || error.status === 404);

/**
 * 서버가 요청을 확정 거절함(4xx). 같은 멱등 키로 다시 보내면 거절이 재생될 수 있어 키를 버릴 때 씀
 * 408·429는 서버가 이미 처리했을 수 있어 거절로 보지 않음(같은 키로 다시 보내 중복 생성을 막음)
 */
export const isDefiniteRejection = (error: unknown) =>
  isApiError(error) &&
  error.status !== undefined &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 408 &&
  error.status !== 429;

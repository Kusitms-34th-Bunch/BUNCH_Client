import { ApiError } from '@app/api-core';

/** 한 번에 올리는 사진 수. 서버는 5개 이하를 권장하고, 쉘이 사진을 가공하는 동안의 메모리도 함께 고려 */
export const UPLOAD_CONCURRENCY = 3;

/**
 * 올리는 도중 새로 올라간 사진을 목록에 보여 주려고 목록을 다시 받는 간격(밀리초)
 * 사진 한 장마다 받으면 목록 전체(최대 1,000장)를 자주 다시 받으므로, 이 간격 안에 올라간 사진은 한 번에 반영함
 */
export const UPLOAD_LIST_REFRESH_MS = 3000;

/**
 * 웹이 보내기 전에 한 번 더 확인하는 업로드 파일 크기 상한
 * 쉘은 4MiB(4,194,304바이트, `UPLOAD_TARGET_BYTES`) 이하로 맞추지만, 운영 웹은 Vercel 함수(요청 본문 약 4.5MB)를 거치므로
 * 멀티파트 경계·필드 크기를 뺀 여유를 두고 넘으면 보내지 않음. 이 값은 쉘의 목표보다 커야 정상 사진이 걸러지지 않으므로 숫자를 바꿀 때 함께 확인
 */
export const MAX_UPLOAD_BYTES = 4.4 * 1000 * 1000;

/** 쉘이 준 이미지가 보낼 수 있는 JPEG인지: 비어 있지 않고 크기 상한 이하이며 JPEG 시작 바이트(FF D8 FF)로 시작 */
export const isUploadableJpeg = async (image: Blob): Promise<boolean> => {
  if (image.size === 0 || image.size > MAX_UPLOAD_BYTES) return false;
  const head = new Uint8Array(await image.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
};

/**
 * 같은 파일을 다시 보내면 성공할 수 있는 서버 오류 코드: 이미지 저장소 일시 장애(`PHOTO_007`)와
 * BFF가 백엔드에 닿지 못했거나 응답을 기다리다 끊은 경우(`BFF_UPSTREAM_UNAVAILABLE`, 응답 대기는 10초)
 * 응답을 받기 전에 끊겨도 서버에는 저장됐을 수 있지만, 다시 보내면 같은 파일이라 `ALREADY_UPLOADED`가 되어 중복 저장은 없음
 */
const RETRYABLE_UPLOAD_CODES = new Set(['PHOTO_007', 'BFF_UPSTREAM_UNAVAILABLE']);

/** 배포처(Vercel)가 코드 없이 돌려주는 게이트웨이 오류(502·504)도 일시적인 것으로 봄 */
const RETRYABLE_GATEWAY_STATUSES = new Set([502, 504]);

/** 하루 한도(`PHOTO_002`)와 한 번에 올릴 수 있는 수(`PHOTO_003`): 같은 묶음의 남은 사진도 모두 거절되므로 더 보내지 않음 */
const LIMIT_UPLOAD_CODES = new Set(['PHOTO_002', 'PHOTO_003']);

/**
 * 사진 한 장의 업로드 결과
 * - `added`: 사진함에 들어감(새로 저장되었거나 다른 멤버가 올린 같은 사진에 올린 사람으로 합쳐짐)
 * - `skipped`: 내가 이미 올린 같은 사진(`ALREADY_UPLOADED`)이라 서버가 변경 없이 제외함(중복). 실패가 없으면 중복 장수로 따로 알리고, 실패가 있으면 「올리지 못한 M장」에 함께 셈
 * - `failed-retryable`: 네트워크 실패·일시 장애라 「다시 시도」 대상
 * - `failed`: 다시 보내도 같은 결과라 「올리지 못한 사진」으로만 셈(형식·용량·한도·권한 오류, 사진을 읽지 못함)
 */
export type UploadOutcome = 'added' | 'skipped' | 'failed-retryable' | 'failed';

/** 같은 파일을 다시 보내면 성공할 수 있는 오류인지(네트워크 실패와 일시 장애만) */
export const isRetryableUploadError = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.category === 'network' ||
    (error.code !== undefined && RETRYABLE_UPLOAD_CODES.has(error.code)) ||
    (error.status !== undefined && RETRYABLE_GATEWAY_STATUSES.has(error.status)));

/**
 * 서버에 저장됐는지 알 수 없는 실패인지: 서버가 4xx로 분명히 거절한 것이 아니라 5xx(코드 없는 500 등)이거나 성공 응답을 읽지 못한 경우
 * 재시도 대상이 아니어도 서버에는 저장됐을 수 있어, 이런 실패가 있으면 사진 목록을 다시 받음
 */
export const isUploadOutcomeUnknown = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.code === 'INVALID_RESPONSE' || (error.status !== undefined && error.status >= 500));

/** 사진함 한도 오류인지(하루 100장·한 번에 50장). 이 오류를 받으면 같은 묶음의 남은 사진은 보내지 않음 */
export const isUploadLimitError = (error: unknown): boolean =>
  error instanceof ApiError && error.code !== undefined && LIMIT_UPLOAD_CODES.has(error.code);

export type UploadSummary = {
  /** 사진함에 들어간 사진 수 */
  added: number;
  /** 올리지 못한 사진 수(다시 시도 대상 포함) */
  failed: number;
  /** 그중 「다시 시도」 대상 수 */
  retryable: number;
  /** 내가 이미 올려 제외된 사진 수 */
  skipped: number;
};

/** 중복으로 제외된 사진(`skipped`)은 추가한 사진에도 실패한 사진에도 세지 않고 따로 셈(결과 문구가 실패 여부에 따라 합쳐서 셈) */
export const summarizeUpload = (outcomes: readonly UploadOutcome[]): UploadSummary => {
  const added = outcomes.filter((outcome) => outcome === 'added').length;
  const retryable = outcomes.filter((outcome) => outcome === 'failed-retryable').length;
  const failed = retryable + outcomes.filter((outcome) => outcome === 'failed').length;
  const skipped = outcomes.filter((outcome) => outcome === 'skipped').length;
  return { added, failed, retryable, skipped };
};

/**
 * 업로드가 끝난 뒤 하나만 띄우는 결과 토스트 문구(기능명세서 3.2.2 상세 동작 4, 기획 확정)
 * N = 새로 추가된 장수(다른 멤버가 올린 같은 사진에 내 배지가 붙은 것도 추가), M = 중복 장수 또는 실패에 중복을 더한 장수
 * 실패가 없으면: 전부 추가 「N장의 사진을 사진함에 추가했어요.」, 일부 중복 「중복된 M장을 제외하고, 사진 N장을 추가했어요.」, 전부 중복 「이미 사진함에 업로드된 사진이에요.」
 * 실패가 있으면(중복도 「올리지 못한 M장」에 함께 셈): 추가한 사진이 있으면 「N장을 추가했어요. M장은 올리지 못했어요.」, 없으면 「사진을 올리지 못했어요.」
 * 못 올린 이유는 나누지 않고 모두 M장에 함께 셈. 올린 사진이 하나도 없으면(빈 선택) 알릴 것이 없어 null
 */
export const uploadResultMessage = ({ added, failed, skipped }: UploadSummary): string | null => {
  if (failed > 0) {
    return added > 0
      ? `${added}장을 추가했어요. ${failed + skipped}장은 올리지 못했어요.`
      : '사진을 올리지 못했어요.';
  }
  if (added > 0) {
    return skipped > 0
      ? `중복된 ${skipped}장을 제외하고, 사진 ${added}장을 추가했어요.`
      : `${added}장의 사진을 사진함에 추가했어요.`;
  }
  return skipped > 0 ? '이미 사진함에 업로드된 사진이에요.' : null;
};

/**
 * 사진 선택창을 한 번 연 단위로 붙이는 묶음 ID(UUID v4)
 * `crypto.randomUUID`는 https·localhost에서만 있어서, 개발 중 `http://<LAN 주소>`로 앱을 열 때를 위해 `getRandomValues`로 만드는 방법을 함께 둠
 */
export const createUploadBatchId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // UUID v4: 버전(4)과 변형(10xx) 비트를 고정
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * 항목을 최대 `limit`개씩 동시에 처리하고 결과를 항목 순서대로 돌려줌
 * `worker`가 던지면 그 오류로 전체가 끝나므로, 항목별 실패는 worker 안에서 결과 값으로 바꿔 돌려줘야 함
 */
export const runPool = async <Item, Result>(
  items: readonly Item[],
  limit: number,
  worker: (_item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results = new Array<Result>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as Item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
};

/** 촬영 현지 날짜(yyyy-MM-dd)와 시각(HH:mm:ss). 알 수 없는 값은 없음 */
export type CapturedAt = { capturedDate?: string; capturedTime?: string };

// 촬영 정보(EXIF)의 날짜 형식 `2026:10:19 19:30:05`. 다른 구분자(`-`, `T`)와 뒤따르는 소수초·시간대는 무시
const EXIF_DATE_TIME = /^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/;

// 기기가 날짜를 못 채울 때 쓰는 `0000:00:00` 같은 값과 터무니없이 오래된 값을 걸러 냄
const MIN_YEAR = 1900;

const pad = (value: number) => String(value).padStart(2, '0');

const isRealDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

/** EXIF 날짜 문자열을 촬영 날짜·시각으로 바꿈. 날짜가 올바르지 않으면 null, 시각만 올바르지 않으면 날짜만 */
export function parseExifDateTime(value: unknown): CapturedAt | null {
  if (typeof value !== 'string') return null;
  const match = EXIF_DATE_TIME.exec(value.trim());
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < MIN_YEAR || !isRealDate(year, month, day)) return null;
  const capturedDate = `${yearText}-${monthText}-${dayText}`;
  if (hourText === undefined || minuteText === undefined || secondText === undefined) {
    return { capturedDate };
  }
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (hour > 23 || minute > 59 || second > 59) return { capturedDate };
  return { capturedDate, capturedTime: `${hourText}:${minuteText}:${secondText}` };
}

// 수정 시각(`DateTime`)은 촬영 시각이 아니라서 쓰지 않음. 촬영 시각(Original)이 없을 때만 디지털화 시각을 대신 씀
const CAPTURE_KEYS = ['DateTimeOriginal', 'DateTimeDigitized'] as const;

const NESTED_EXIF_KEYS = ['{Exif}', 'Exif'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 최상위를 먼저, 그다음 하위 `{Exif}` 객체. 위치 하위 객체(`{GPS}` 등)는 열어 보지 않고, 카메라 정보를 담는 `{TIFF}`는 원본 유형 판단(`classifySource`)에서만 따로 엶
function exifScopes(exif: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
  if (!exif) return [];
  const nested = NESTED_EXIF_KEYS.map((key) => exif[key]).filter(isRecord);
  return [exif, ...nested];
}

/**
 * 사진의 촬영 정보(EXIF)에서 촬영 현지 날짜·시각만 꺼냄
 * 결과에는 날짜·시각 외의 값(위치 등)을 담지 않으므로 호출부가 EXIF 전체를 넘겨도 위치는 새어 나가지 않음
 */
export function readCapturedAt(exif: Record<string, unknown> | null | undefined): CapturedAt {
  // iOS는 태그를 `{Exif}` 같은 하위 객체에 묶어 주기도 하므로 최상위와 그 안을 모두 봄
  for (const scope of exifScopes(exif)) {
    for (const key of CAPTURE_KEYS) {
      const parsed = parseExifDateTime(scope[key]);
      if (parsed) return parsed;
    }
  }
  return {};
}

// 서버가 받는 UTC 오프셋 범위(-12:00 ~ +14:00, 서버 PR #153)
const UTC_OFFSET = /^([+-])(\d{2}):(\d{2})$/;
const MIN_OFFSET_MINUTES = -12 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

/** `±HH:mm` 문자열이 서버가 받는 범위(-12:00 ~ +14:00)의 오프셋이면 그대로, 아니면 없음 */
export function parseUtcOffset(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = UTC_OFFSET.exec(value.trim());
  if (!match) return undefined;
  const [, sign, hourText, minuteText] = match;
  const minutes = Number(hourText) * 60 + Number(minuteText);
  if (Number(minuteText) > 59) return undefined;
  const signed = sign === '-' ? -minutes : minutes;
  if (signed < MIN_OFFSET_MINUTES || signed > MAX_OFFSET_MINUTES) return undefined;
  return `${sign}${hourText}:${minuteText}`;
}

// 촬영 시각의 UTC 오프셋 태그. 촬영 시각(Original)을 먼저 보고 없으면 디지털화 시각의 것을 대신 씀
const OFFSET_KEYS = ['OffsetTimeOriginal', 'OffsetTimeDigitized'] as const;

/**
 * 사진의 촬영 정보(EXIF)에서 촬영 시각의 UTC 오프셋(`+09:00`)만 꺼냄. 없거나 범위 밖이면 없음(서버는 한국 시간으로 봄)
 * 결과에는 오프셋 외의 값(위치 등)을 담지 않음
 */
export function readCapturedUtcOffset(
  exif: Record<string, unknown> | null | undefined,
): string | undefined {
  for (const scope of exifScopes(exif)) {
    for (const key of OFFSET_KEYS) {
      const parsed = parseUtcOffset(scope[key]);
      if (parsed) return parsed;
    }
  }
  return undefined;
}

/** 기기의 그 시각 UTC 오프셋(`+09:00`). 카메라로 바로 찍어 촬영 정보가 비어 있을 때 씀 */
export function formatUtcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** 서버가 받는 사진의 원본 유형(서버 PR #153). 추천 번들에서 카메라 원본만 쓰는 데 씀 */
export type PhotoSourceType = 'CAMERA' | 'SCREENSHOT' | 'SAVED_IMAGE' | 'UNKNOWN';

const CAMERA_KEYS = ['Make', 'Model'] as const;

// iOS는 카메라 제조사·모델을 {TIFF} 하위 객체에 묶어 줌(촬영 날짜·오프셋 읽기에서는 열지 않음)
const CAMERA_NESTED_KEYS = ['{TIFF}', 'TIFF'] as const;

const hasText = (value: unknown) => typeof value === 'string' && value.trim() !== '';

// iOS 스크린샷은 UserComment에 「Screenshot」이 들어 있고, 안드로이드 스크린샷은 파일 이름이 Screenshot으로 시작하는 경우가 많음
const SCREENSHOT_FILE_NAME = /^(screenshot|screen[ _-]?shot|스크린샷)/i;

/**
 * 사진의 원본 유형을 EXIF(와 파일 이름)로 분류
 * - SCREENSHOT: 스크린샷으로 보이는 신호가 있음(서버 추천에서는 SAVED_IMAGE와 똑같이 「쓸 수 없는 사진」)
 * - CAMERA: 카메라 제조사·모델 정보가 있음
 * - SAVED_IMAGE: EXIF는 읽었지만 카메라 정보가 없음(메신저·다운로드 등으로 저장한 이미지)
 * - UNKNOWN: EXIF를 읽지 못해 판단하지 못함(서버에서 값 없음(NULL)과 구분됨)
 * 앱 안 카메라로 직접 찍은 사진은 EXIF가 비어 있어도 호출부가 CAMERA로 정함
 */
export function classifySource(
  exif: Record<string, unknown> | null | undefined,
  fileName?: string | null,
): PhotoSourceType {
  if (!exif) return 'UNKNOWN';
  const scopes = [
    ...exifScopes(exif),
    ...CAMERA_NESTED_KEYS.map((key) => exif[key]).filter(isRecord),
  ];
  const screenshot =
    (typeof fileName === 'string' && SCREENSHOT_FILE_NAME.test(fileName.trim())) ||
    scopes.some(
      (scope) => typeof scope.UserComment === 'string' && /screenshot/i.test(scope.UserComment),
    );
  if (screenshot) return 'SCREENSHOT';
  const camera = scopes.some((scope) => CAMERA_KEYS.some((key) => hasText(scope[key])));
  return camera ? 'CAMERA' : 'SAVED_IMAGE';
}

/** 기기 현지 날짜·시각(카메라로 찍었는데 촬영 정보가 비어 있을 때 촬영 시각 대신 씀) */
export function formatLocalDateTime(date: Date): Required<CapturedAt> {
  return {
    capturedDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    capturedTime: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

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

// 최상위를 먼저, 그다음 하위 `{Exif}` 객체. 다른 하위 객체(`{GPS}` 등)는 열어 보지 않음
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

/** 기기 현지 날짜·시각(카메라로 찍었는데 촬영 정보가 비어 있을 때 촬영 시각 대신 씀) */
export function formatLocalDateTime(date: Date): Required<CapturedAt> {
  return {
    capturedDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    capturedTime: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

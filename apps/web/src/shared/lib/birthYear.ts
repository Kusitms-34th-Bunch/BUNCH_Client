export const BIRTH_YEAR_MIN = 1930;
// 현재 연도에서 뺄 연수(연도 차이만 쓰고 생일은 보지 않음)
const MIN_AGE_YEARS = 14;

export const getBirthYearMax = (currentYear: number) => currentYear - MIN_AGE_YEARS;

/** 숫자만 남기고 최대 4자리로 자름(숫자 키보드 직접 입력) */
export const sanitizeBirthYear = (value: string) => value.replace(/\D/g, '').slice(0, 4);

export const isCompleteBirthYear = (value: string) => value.length === 4;

export const isBirthYearInRange = (value: string, currentYear: number) => {
  if (!isCompleteBirthYear(value)) return false;
  const year = Number(value);
  return year >= BIRTH_YEAR_MIN && year <= getBirthYearMax(currentYear);
};

/** 선택 입력이라 비어 있으면 유효, 값이 있으면 4자리·범위 안일 때만 유효 */
export const isValidBirthYear = (value: string, currentYear: number) =>
  value === '' || isBirthYearInRange(value, currentYear);

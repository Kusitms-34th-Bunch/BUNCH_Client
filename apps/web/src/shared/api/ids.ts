// 서버 숫자 ID는 2^53 - 1 이하만 정확해서 더 큰 값은 잘못된 ID로 간주
const WIRE_ID_PATTERN = /^[1-9]\d{0,15}$/;

/** 서버 숫자 ID를 화면 문자열 id로 변환 */
export const toDomainId = (id: number): string => String(id);

/** 화면 문자열 id(주소 조각 포함)를 서버 숫자 ID로 변환, 양의 정수가 아니면 undefined */
export const toWireId = (id: string | readonly string[] | undefined): number | undefined => {
  if (typeof id !== 'string' || !WIRE_ID_PATTERN.test(id)) return undefined;
  const value = Number(id);
  return Number.isSafeInteger(value) ? value : undefined;
};

/** 서버 숫자 ID로 바꿀 수 있는 화면 id인지 판정(요청을 건너뛸지 정하는 query·화면용, 변환은 api/에서만) */
export const isWireId = (id: string | undefined): boolean => toWireId(id) !== undefined;

/** 요청 직전 변환, 바꿀 수 없으면 요청 전에 실패 처리(api/ 전용) */
export const requireWireId = (id: string, message: string): number => {
  const value = toWireId(id);
  if (value === undefined) throw new Error(message);
  return value;
};

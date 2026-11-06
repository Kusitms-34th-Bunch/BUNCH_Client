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

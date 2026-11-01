// 영문·숫자·밑줄·하이픈 64자 이하만 초안 id로 인정(주소는 외부 입력)
const DRAFT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** route 경계에서 초안 id 형식을 검증. 틀리면 undefined */
export const parseDraftId = (value: string): string | undefined =>
  DRAFT_ID_PATTERN.test(value) ? value : undefined;

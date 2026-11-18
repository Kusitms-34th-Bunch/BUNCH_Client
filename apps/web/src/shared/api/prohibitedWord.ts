import { isApiError } from '@app/api-core';

/** 금칙어가 들어 있어 서버가 저장·등록을 거부함(HTTP 400, 기능명세 1.4.3 로직 4). 서버 ErrorCode에서 금칙어 전용 코드(BUNCH_Server#163) */
export const PROHIBITED_WORD_CODE = 'COMMON_003';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * 금칙어 거부(`COMMON_003`)이면 걸린 칸 이름 목록(`error.detail.fields`, 예: `nickname`·`name`·`introduction`·`content`), 아니면 null
 * 칸 이름을 읽지 못해도 금칙어 거부면 빈 목록. 걸린 단어는 서버가 알려 주지 않음
 */
export const prohibitedFieldsOf = (error: unknown): readonly string[] | null => {
  if (!isApiError(error) || error.code !== PROHIBITED_WORD_CODE) return null;
  const body = isRecord(error.data) && isRecord(error.data.error) ? error.data.error : undefined;
  const fields = isRecord(body?.detail) ? body.detail.fields : undefined;
  return Array.isArray(fields)
    ? fields.filter((field): field is string => typeof field === 'string')
    : [];
};

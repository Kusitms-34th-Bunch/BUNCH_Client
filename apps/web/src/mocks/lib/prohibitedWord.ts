import { fail } from './envelope';

/** 가짜 서버의 금칙어 시연: 이 낱말이 들어간 값만 금칙어로 봄(실서버는 공개 목록·공백/특수문자 제거 비교) */
export const MOCK_PROHIBITED_WORD = '금칙어';

export const hasMockProhibitedWord = (value: string) => value.includes(MOCK_PROHIBITED_WORD);

/** 금칙어가 들어간 칸이 있으면 서버처럼 400 `COMMON_003`(`detail.fields`)을, 없으면 null을 돌려줌 */
export const failIfProhibited = (fields: Readonly<Record<string, string>>) => {
  const rejected = Object.keys(fields).filter((field) =>
    hasMockProhibitedWord(fields[field] ?? ''),
  );
  return rejected.length > 0 ? fail(400, 'COMMON_003', { fields: rejected }) : null;
};

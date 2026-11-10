/** 번치 만들기·사진 변경·초대 링크의 공통 실패 안내(기획 2.2.10·2.3.2·2.4.1) */
export const ONBOARDING_MESSAGES = {
  temporaryFailure: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  bunchLimit: '참여할 수 있는 번치는 최대 10개예요.',
} as const;

/** 서버 오류 코드: 이름 중복, 소속 번치 한도 */
export const BUNCH_ERROR_CODES = {
  nameTaken: 'BUNCH_001',
  limitExceeded: 'BUNCH_003',
} as const;

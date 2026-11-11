/** 초대 진입 페이지의 안내(기능명세 2.5.4와 같은 문구) */
// 429 `REQUEST_002`(공개 조회는 IP당 분당 60회)는 기획 문구가 없어 일시적 오류 문구로 처리함(같은 IP를 쓰는 인앱 브라우저에서는 즉시 재시도가 다시 429일 수 있음)
export const INVITE_ENTRY_MESSAGES = {
  invalidInvitation: '유효하지 않은 링크입니다.',
  temporaryFailure: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  // 기획 원문이 없는 임시 문구(앱스토어 연결 전까지)
  installComingSoon: '앱스토어 이동은 곧 지원돼요.',
} as const;

/** 없거나 만료·폐기된 초대(서버가 구분하지 않음) */
export const INVITATION_INVALID_CODE = 'INVITE_001';

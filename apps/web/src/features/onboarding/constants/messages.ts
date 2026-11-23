import { COMMON_MESSAGES } from '@/shared/constants/messages';

/** 번치 만들기·사진 변경·초대 링크·초대 참여의 공통 안내(기획 2.2.10·2.3.2·2.4.1·2.5.4) */
export const ONBOARDING_MESSAGES = {
  temporaryFailure: COMMON_MESSAGES.temporaryFailure,
  bunchLimit: COMMON_MESSAGES.bunchLimit,
  invalidInvitation: COMMON_MESSAGES.invalidInvitation,
  fullBunch: '최대 인원을 초과한 번치입니다.',
  alreadyMember: '이미 참여 중인 번치예요.',
} as const;

/** 서버 오류 코드: 이름 중복, 소속 번치 한도, 정원 초과, 초대 무효 */
export const BUNCH_ERROR_CODES = {
  nameTaken: 'BUNCH_001',
  full: 'BUNCH_002',
  limitExceeded: 'BUNCH_003',
} as const;

export const INVITATION_ERROR_CODES = {
  invalid: 'INVITE_001',
} as const;

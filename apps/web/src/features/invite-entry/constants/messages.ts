import { COMMON_MESSAGES } from '@/shared/constants/messages';
import {
  APP_STORE_APP_ID as SITE_APP_STORE_APP_ID,
  APP_STORE_URL as SITE_APP_STORE_URL,
  OPEN_LINK_ORIGIN as SITE_OPEN_LINK_ORIGIN,
  SITE_ORIGIN,
} from '@/shared/constants/site';

/** 초대 진입 페이지의 안내(기능명세 2.5.4와 같은 문구) */
// 429 `REQUEST_002`(공개 조회는 IP당 분당 60회)는 기획 문구가 없어 일시적 오류 문구로 처리함(같은 IP를 쓰는 인앱 브라우저에서는 즉시 재시도가 다시 429일 수 있음)
export const INVITE_ENTRY_MESSAGES = {
  invalidInvitation: COMMON_MESSAGES.invalidInvitation,
  temporaryFailure: COMMON_MESSAGES.temporaryFailure,
  // iOS가 아닌 기기(Android·PC)에서 「앱 설치하기」를 눌렀을 때. 기획 원문이 없는 임시 문구(#489)
  iosOnly: '지금은 iOS 앱만 지원해요.',
} as const;

/** 「앱 설치하기」가 여는 App Store 앱 페이지(App Store Connect 앱 Apple ID, 기능명세 2.7.1) */
export const APP_STORE_APP_ID = SITE_APP_STORE_APP_ID;
export const APP_STORE_URL = SITE_APP_STORE_URL;

/** 앱이 유니버셜 링크로 받는 초대 링크의 출처(쉘 app.json `applinks:app.bunch.kr`·`src/invite-link.ts`와 같은 값). 앱 배너 「열기」가 앱에 넘김 */
export const INVITE_LINK_ORIGIN = SITE_ORIGIN;

/**
 * 진입 페이지의 「초대장 확인하기」가 넘기는 앱 열기 도메인(쉘 `applinks:open.bunch.kr`·`src/invite-link.ts`, `next.config.mjs` redirects와 같은 값)
 * 사용자에게 보이는 페이지가 없고, 앱이 없으면 서버가 App Store로 보냄
 */
export const OPEN_LINK_ORIGIN = SITE_OPEN_LINK_ORIGIN;

/** 없거나 만료·폐기된 초대(서버가 구분하지 않음) */
export const INVITATION_INVALID_CODE = 'INVITE_001';

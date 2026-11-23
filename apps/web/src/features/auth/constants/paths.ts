import { APP_PATHS } from '@/shared/constants/paths';
import type { SignupTermsDocumentId } from './terms';

// 쉘이 이 두 경로에서 뒤로 가기를 막음(apps/mobile-shell/src/web-url.ts `NO_BACK_PATHS`), 바꾸면 함께 바꿈
export const LOGIN_PATH = APP_PATHS.login;
/** 앱을 처음 실행한 사람에게만 보이는 인트로와 온보딩 가이드 */
export const INTRO_PATH = '/intro';

export const SIGNUP_PATHS = {
  terms: '/signup/terms',
  profile: '/signup/profile',
  termsDocument: (documentId: SignupTermsDocumentId) => `/signup/terms/${documentId}`,
} as const;

/** 화면 전환 규칙(`AppTransitions`)이 쓰는 화면 id. 원문 화면은 약관마다 주소가 달라도 하나로 취급 */
export const SIGNUP_TRANSITION_IDS = {
  termsDocument: '/signup/terms/document',
} as const;

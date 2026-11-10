import type { OnboardingState } from '../api/onboarding';
import { INTRO_PATH, LOGIN_PATH, SIGNUP_PATHS } from '../constants/paths';
import { type PostLoginDestinations, resolvePostLoginPath } from './postLoginPath';

/** 서버가 알려 준 세션 상태. 로그인하지 않았거나(401) 가입 상태를 읽은 경우 */
export type SessionState = { kind: 'anonymous' } | { kind: 'member'; onboarding: OnboardingState };

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * 지금 화면에 들어가도 되는지 판단해, 막아야 하면 대신 보낼 경로를 돌려줌(들어가도 되면 null)
 * 비로그인: 로그인만(인트로를 본 적 없으면 인트로만) / 가입 중: 약관(미동의), 약관·프로필(동의) / 가입 완료: 로그인·가입 화면 밖 전체(기획 1.2.7·1.2.8)
 * 가입 중 사용자의 로그인 화면은 막지 않음: 로그인 직후 이동이 로그인 화면에서 시작하고, 약관의 뒤로가기(로그아웃 뒤 문서 새로 불러오기, 기획 1.3.5) 전후에 가드가 로그인 화면을 되돌리면 흐름이 깨짐
 * `introSeen`은 보여 줄 화면만 고르고 접근을 넓히지 않음(인트로도 비로그인 화면)
 */
export const resolveAccess = (
  pathname: string,
  session: SessionState,
  destinations: PostLoginDestinations,
  introSeen: boolean,
): string | null => {
  if (session.kind === 'anonymous') {
    const entry = introSeen ? LOGIN_PATH : INTRO_PATH;
    return pathname === entry ? null : entry;
  }

  const { onboarding } = session;
  if (onboarding.signupStatus === 'COMPLETED') {
    return pathname === LOGIN_PATH || pathname === INTRO_PATH || isUnder(pathname, '/signup')
      ? resolvePostLoginPath(onboarding, destinations)
      : null;
  }

  if (pathname === LOGIN_PATH) return null;
  const inTerms = isUnder(pathname, SIGNUP_PATHS.terms);
  if (!onboarding.termsAccepted) return inTerms ? null : SIGNUP_PATHS.terms;
  return inTerms || pathname === SIGNUP_PATHS.profile ? null : SIGNUP_PATHS.profile;
};

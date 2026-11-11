import type { OnboardingState } from '../api/onboarding';
import { SIGNUP_PATHS } from '../constants/paths';

/** 다른 feature가 소유한 도착 화면 경로. 가져오기 제한 때문에 route(page·layout)가 조합해 전달 */
export type PostLoginDestinations = {
  /** 번치 홈(기본 번치가 있는 가입 완료 사용자) */
  bunchHome: string;
  /** 번치 시작 선택(소속 번치가 없는 가입 완료 사용자) */
  bunchStart: string;
  /** 보관된 초대로 들어가는 진입(초대 확인 뒤 초대 화면, 가입 완료 사용자) */
  inviteEntry: string;
};

/**
 * 가입 상태에 따른 도착 화면(기획 1.2.7·1.2.8)
 * 가입 중: 약관 미동의 → 약관, 동의 → 프로필 / 가입 완료: 보관된 초대가 있으면 초대 진입, 없으면 기본 번치가 있을 때 번치 홈, 없으면 번치 시작 선택
 * 초대 링크로 들어와 로그인·가입을 마친 사용자는 번치 홈보다 초대 확인이 먼저(기능명세 1.2.8 첫 번째 규칙, 1.4.7)
 */
export const resolvePostLoginPath = (
  { signupStatus, termsAccepted, hasDefaultBunch }: OnboardingState,
  destinations: PostLoginDestinations,
  hasPendingInvitation = false,
): string => {
  if (signupStatus === 'IN_PROGRESS') {
    return termsAccepted ? SIGNUP_PATHS.profile : SIGNUP_PATHS.terms;
  }
  if (hasPendingInvitation) return destinations.inviteEntry;
  return hasDefaultBunch ? destinations.bunchHome : destinations.bunchStart;
};

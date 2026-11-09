import type { OnboardingState } from '../api/onboarding';
import { SIGNUP_PATHS } from '../constants/paths';

/** 다른 feature가 소유한 도착 화면 경로. 가져오기 제한 때문에 route(page·layout)가 조합해 전달 */
export type PostLoginDestinations = {
  /** 번치 홈(기본 번치가 있는 가입 완료 사용자) */
  bunchHome: string;
  /** 번치 시작 선택(소속 번치가 없는 가입 완료 사용자) */
  bunchStart: string;
};

/**
 * 가입 상태에 따른 도착 화면(기획 1.2.7·1.2.8)
 * 가입 중: 약관 미동의 → 약관, 동의 → 프로필 / 가입 완료: 기본 번치가 있으면 번치 홈, 없으면 번치 시작 선택
 * 초대 정보에 따른 초대 참여는 초대 정보 보관을 만들 때 가장 앞에 붙임
 */
export const resolvePostLoginPath = (
  { signupStatus, termsAccepted, hasDefaultBunch }: OnboardingState,
  destinations: PostLoginDestinations,
): string => {
  if (signupStatus === 'IN_PROGRESS') {
    return termsAccepted ? SIGNUP_PATHS.profile : SIGNUP_PATHS.terms;
  }
  return hasDefaultBunch ? destinations.bunchHome : destinations.bunchStart;
};

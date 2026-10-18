// joinBunch(참여 화면)는 route 미구현이라 이동 시 404. 해당 경로는 spec의 임시 값
export const ONBOARDING_PATHS = {
  createBunch: '/onboarding/create',
  createBunchDescription: '/onboarding/create/description',
  createBunchMood: '/onboarding/create/mood',
  createBunchComplete: '/onboarding/create/complete',
  joinBunch: '/onboarding/join',
  // 번치 만들기를 그만두면 이동하는 홈(피드 탭). 홈 route가 아직 피드 화면이 아니라 현재는 `/`
  feed: '/',
} as const;

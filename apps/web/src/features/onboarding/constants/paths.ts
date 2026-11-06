// 경로는 spec의 임시 값
export const ONBOARDING_PATHS = {
  start: '/onboarding',
  /** 번치 홈 「새로운 번치 추가하기」로 들어왔음을 알리는 쿼리 값(닫기 = 이전 화면) */
  startFromBunchQuery: 'bunch',
  createBunch: '/onboarding/create',
  createBunchDescription: '/onboarding/create/description',
  createBunchMood: '/onboarding/create/mood',
  createBunchComplete: '/onboarding/create/complete',
  createBunchInvite: '/onboarding/create/invite',
  joinBunch: '/onboarding/join',
  joinBunchMotion: '/onboarding/join/motion',
  joinBunchInvitation: '/onboarding/join/invitation',
  joinBunchComplete: '/onboarding/join/complete',
  // 피드 화면 연결 전 임시 홈 경로
  feed: '/',
} as const;

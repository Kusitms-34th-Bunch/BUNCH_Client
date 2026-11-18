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
  /** 보관된 초대를 서버에 확인하고 초대 확인 화면으로 이어 주는 진입(초대 링크로 들어온 사용자) */
  joinBunchEnter: '/onboarding/join/enter',
  joinBunchInvitation: '/onboarding/join/invitation',
  joinBunchComplete: '/onboarding/join/complete',
  // 온보딩 「나가기」·참여 완료 뒤 이동하는 피드 탭
  feed: '/feed',
} as const;

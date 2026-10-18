// 경로는 spec의 임시 값
export const ONBOARDING_PATHS = {
  start: '/onboarding',
  createBunch: '/onboarding/create',
  createBunchDescription: '/onboarding/create/description',
  createBunchMood: '/onboarding/create/mood',
  createBunchComplete: '/onboarding/create/complete',
  createBunchInvite: '/onboarding/create/invite',
  joinBunch: '/onboarding/join',
  // 초대 링크 확인 중 초대장 로티를 재생하는 화면. 끝나면 초대 확인 화면으로 자동 이동
  joinBunchMotion: '/onboarding/join/motion',
  // 초대받은 번치 정보를 보여 주고 참여할지 묻는 화면
  joinBunchInvitation: '/onboarding/join/invitation',
  // 번치 참여를 마친 뒤 보는 완료 화면
  joinBunchComplete: '/onboarding/join/complete',
  // 번치 만들기를 그만두면 이동하는 홈(피드 탭). 홈 route가 아직 피드 화면이 아니라 현재는 `/`
  feed: '/',
} as const;

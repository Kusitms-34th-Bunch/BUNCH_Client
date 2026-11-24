import { APP_PATHS } from '@/shared/constants/paths';

// 경로는 spec의 임시 값
export const ONBOARDING_PATHS = {
  start: '/onboarding',
  /** 번치 홈 「새로운 번치 추가하기」로 들어왔음을 알리는 쿼리 값(닫기 = 이전 화면) */
  startFromBunchQuery: 'bunch',
  createBunch: APP_PATHS.createBunch,
  createBunchDescription: '/onboarding/create/description',
  createBunchMood: '/onboarding/create/mood',
  createBunchComplete: '/onboarding/create/complete',
  createBunchInvite: '/onboarding/create/invite',
  joinBunch: APP_PATHS.joinBunch,
  /** 보관된 초대를 서버에 확인하고 초대 확인 화면으로 이어 주는 진입(초대 링크로 들어온 사용자) */
  joinBunchEnter: '/onboarding/join/enter',
  joinBunchInvitation: '/onboarding/join/invitation',
  joinBunchComplete: '/onboarding/join/complete',
  // 온보딩 「나가기」·참여 완료 뒤 이동하는 피드 탭
  feed: APP_PATHS.feed,
  /** 번치 탭(기본 번치 홈). 번치를 만든 직후 초대 화면을 닫으면 만든 번치가 기본 번치라 그 홈으로 감(기능명세 2.4.4·2.4.5) */
  bunchHome: APP_PATHS.bunch,
} as const;

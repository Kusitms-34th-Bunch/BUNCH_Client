/** 둘 이상의 feature가 이동 위치로 쓰는 route 경로. 각 feature의 경로 상수는 자기 이름을 두고 값만 여기서 가져옴 */
export const APP_PATHS = {
  /** 하단 탭 첫 화면 */
  feed: '/feed',
  photos: '/photos',
  bunch: '/bunch',
  /** 번치 홈의 「작성 중인 번들」 탭 */
  bunchDrafts: '/bunch?tab=drafts',
  my: '/my',
  login: '/login',
  createBunch: '/onboarding/create',
  joinBunch: '/onboarding/join',
  /** 번들 만들기 첫 단계(함께 만들 멤버 고르기) */
  createBundle: '/bunch/bundles/new/members',
  memberInvite: '/bunch/members/invite',
  notificationSettings: '/my/notifications',
} as const;

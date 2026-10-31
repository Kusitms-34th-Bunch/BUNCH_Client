export const PHOTO_BOX_PATHS = {
  /** 사진함 탭(상세에서 돌아갈 곳) */
  list: '/photos',
  /** 사진 상세 */
  detail: (photoId: string) => `/photos/${photoId}`,
  // 번치 없음 화면에서 이어지는 온보딩 route(URL 계약만 두고 onboarding feature는 import하지 않음)
  createBunch: '/onboarding/create',
  joinBunch: '/onboarding/join',
} as const;

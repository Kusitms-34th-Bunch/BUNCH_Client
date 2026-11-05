export const PHOTO_BOX_PATHS = {
  /** 사진함 탭(상세에서 돌아갈 곳) */
  list: '/photos',
  /** 사진 상세 */
  detail: (photoId: string) => `/photos/${photoId}`,
  // 번치 없음 화면에서 이어지는 온보딩 route(URL 계약만 두고 onboarding feature는 import하지 않음)
  createBunch: '/onboarding/create',
  joinBunch: '/onboarding/join',
  // 번들 만들기에서 만든 초안의 작성 화면(URL 계약만 두고 bundle feature는 import하지 않음). 초안 생성 API 연결 전에는 샘플 초안 id를 씀
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
} as const;

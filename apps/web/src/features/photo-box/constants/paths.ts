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
  /** 동적 route의 전환 경계 id(규칙과 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: {
    detail: '/photos/detail',
  },
} as const;

/** 사진함 썸네일과 사진 상세의 같은 사진을 잇는 화면 전환 공유 요소 키(SSGOI hero) */
export const photoHeroKey = (photoId: string) => `photo-${photoId}`;

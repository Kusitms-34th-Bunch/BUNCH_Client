/** 번들 만들기(사진 선택·추천 번들) 흐름의 route 경로 */
export const BUNDLE_SELECT_PATHS = {
  /** 번들 만들기의 첫 단계: 함께 만들 멤버 고르기(번치 홈 「+」의 진입 위치) */
  members: '/bunch/bundles/new/members',
  select: '/bunch/bundles/new',
  recommendation: (recommendationId: string) =>
    `/bunch/bundles/new/recommendations/${recommendationId}`,
  viewer: (recommendationId: string, photoId: string) =>
    `/bunch/bundles/new/recommendations/${recommendationId}/photos/${photoId}`,
  /** 페이지 전환 경계 id: 추천 상세는 동적 route라 약관 원문처럼 고정 id를 규칙과 화면 DOM에 함께 씀 */
  transitionIds: { recommendation: '/bunch/bundles/new/recommendation' },
  /** 번치 홈: 직접 주소로 들어와 돌아갈 기록이 없을 때의 이동 위치 */
  bunchHome: '/bunch',
  /** 만든 초안의 작성 화면 */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
} as const;

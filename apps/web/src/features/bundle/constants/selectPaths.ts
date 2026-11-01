/** 번들 만들기(사진 선택·추천 번들) 흐름의 route 경로 */
export const BUNDLE_SELECT_PATHS = {
  select: '/bunch/bundles/new',
  recommendation: (recommendationId: string) =>
    `/bunch/bundles/new/recommendations/${recommendationId}`,
  viewer: (recommendationId: string, photoId: string) =>
    `/bunch/bundles/new/recommendations/${recommendationId}/photos/${photoId}`,
  /** 페이지 전환 경계 id: 추천 상세는 동적 route라 약관 원문처럼 고정 id를 규칙과 화면 DOM에 함께 씀 */
  transitionIds: { recommendation: '/bunch/bundles/new/recommendation' },
  /** 번치 홈: 직접 주소로 들어와 돌아갈 기록이 없을 때의 이동 위치 */
  bunchHome: '/bunch',
  /** 만든 초안의 작성 화면. 초안 생성 API 연결 전에는 샘플 초안 id를 씀 */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
} as const;

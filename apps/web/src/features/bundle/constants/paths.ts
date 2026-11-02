export const BUNDLE_PATHS = {
  /** 번치 홈(나가기·이탈 뒤 돌아갈 곳) */
  bunchHome: '/bunch',
  /** 공동 편집(작성) 화면 */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
  /** 참여 멤버 관리 화면 */
  members: (draftId: string) => `/bunch/drafts/${draftId}/members`,
  /** 사진 상세 캡션 화면(보고 있는 사진을 주소가 가리킴) */
  photo: (draftId: string, photoId: string) => `/bunch/drafts/${draftId}/photos/${photoId}`,
  /** 사진 크게 보기 */
  photoViewer: (draftId: string, photoId: string) =>
    `/bunch/drafts/${draftId}/photos/${photoId}/viewer`,
  /** 페이지 전환 경계 id: 동적 route라 고정 id를 규칙(`AppTransitions`)과 각 화면 DOM에 함께 씀 */
  transitionIds: {
    draft: '/bunch/drafts/draft',
    members: '/bunch/drafts/members',
    photo: '/bunch/drafts/photo',
  },
} as const;

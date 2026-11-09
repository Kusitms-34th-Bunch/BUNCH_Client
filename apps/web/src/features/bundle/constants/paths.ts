export const BUNDLE_PATHS = {
  /** 번치 홈(나가기·이탈 뒤 돌아갈 곳) */
  bunchHome: '/bunch',
  /** 공동 편집(작성) 화면 */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
  /** 대표 사진 투표(「마음에 드는 사진을 픽해보세요」) 화면 */
  pick: (draftId: string) => `/bunch/drafts/${draftId}/pick`,
  /** 업로드 직전 공개 범위 고르기 화면 */
  visibility: (draftId: string) => `/bunch/drafts/${draftId}/visibility`,
  /** 참여 멤버 관리 화면 */
  members: (draftId: string) => `/bunch/drafts/${draftId}/members`,
  /** 사진 상세 캡션 화면(보고 있는 사진을 주소가 가리킴) */
  photo: (draftId: string, photoId: string) => `/bunch/drafts/${draftId}/photos/${photoId}`,
  /** 사진 추가(사진함에서 고르기) 화면 */
  photoAdd: (draftId: string) => `/bunch/drafts/${draftId}/photos/add`,
  /** 사진 크게 보기 */
  photoViewer: (draftId: string, photoId: string) =>
    `/bunch/drafts/${draftId}/photos/${photoId}/viewer`,
  /** 페이지 전환 경계 id: 동적 route라 고정 id를 규칙(`AppTransitions`)과 각 화면 DOM에 함께 씀 */
  transitionIds: {
    draft: '/bunch/drafts/draft',
    members: '/bunch/drafts/members',
    visibility: '/bunch/drafts/visibility',
    pick: '/bunch/drafts/pick',
    viewer: '/bunch/drafts/viewer',
    photo: '/bunch/drafts/photo',
    photoAdd: '/bunch/drafts/photo-add',
  },
} as const;

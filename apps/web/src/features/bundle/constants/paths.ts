export const BUNDLE_PATHS = {
  /** 번치 홈(나가기·이탈 뒤 돌아갈 곳) */
  bunchHome: '/bunch',
  /** 공동 편집(작성) 화면 */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
  /** 참여 멤버 관리 화면 */
  members: (draftId: string) => `/bunch/drafts/${draftId}/members`,
} as const;

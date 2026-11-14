export const FEED_PATHS = {
  /** 피드 탭 */
  home: '/feed',
  /** 번들 상세(기능명세서 6.2). 발행 번들 상세 API(명세 084)가 번치 ID를 함께 받아 주소에 둠 */
  bundle: (bunchId: string, bundleId: string) => `/bunches/${bunchId}/bundles/${bundleId}`,
  /** 번들 상세 댓글 영역으로 바로 가기 */
  bundleComments: (bunchId: string, bundleId: string) =>
    `/bunches/${bunchId}/bundles/${bundleId}?focus=comments`,
  /** 번들 공개 범위 설정(메인 관리자, Figma `5367:151676`) */
  bundleVisibility: (bunchId: string, bundleId: string) =>
    `/bunches/${bunchId}/bundles/${bundleId}/visibility`,
  /** 멤버 프로필(기능명세서 6.3.3) */
  member: (memberId: string) => `/members/${memberId}`,
  /** 동적 route의 전환 경계 id(규칙과 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: {
    bundle: '/bundles/detail',
    bundleVisibility: '/bundles/visibility',
    member: '/members/profile',
  },
} as const;

export const FEED_PATHS = {
  /** 피드 탭 */
  home: '/feed',
  /** 번들 상세(기능명세서 6.2) */
  bundle: (bundleId: string) => `/bundles/${bundleId}`,
  /** 번들 상세 댓글 영역으로 바로 가기 */
  bundleComments: (bundleId: string) => `/bundles/${bundleId}?focus=comments`,
  /** 멤버 프로필(기능명세서 6.3.3) */
  member: (memberId: string) => `/members/${memberId}`,
  /** 동적 route의 전환 경계 id(규칙과 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: { bundle: '/bundles/detail', member: '/members/profile' },
} as const;

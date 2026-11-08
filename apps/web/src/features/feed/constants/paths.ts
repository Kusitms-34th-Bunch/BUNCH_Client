export const FEED_PATHS = {
  /** 피드 탭 */
  home: '/feed',
  /** 번들 상세(기능명세서 6.2). 화면은 다음 이슈(구현 단위 2)에서 추가하며 그전까지는 404 */
  bundle: (bundleId: string) => `/bundles/${bundleId}`,
  /** 번들 상세 댓글 영역으로 바로 가기 */
  bundleComments: (bundleId: string) => `/bundles/${bundleId}?focus=comments`,
} as const;

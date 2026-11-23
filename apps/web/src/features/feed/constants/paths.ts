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
  /** 번들 수정(메인 관리자, 기능명세서 6.2.12) */
  bundleEdit: (bunchId: string, bundleId: string) => `/bunches/${bunchId}/bundles/${bundleId}/edit`,
  /** 멤버 프로필(기능명세서 6.3.3) */
  member: (memberId: string) => `/members/${memberId}`,
  /** 동적 route의 전환 경계 id(규칙과 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: {
    bundle: '/bundles/detail',
    // 말풍선 진입(같은 상세, 피드 카드가 열리는 zoom을 쓰려고 이름만 나눔)
    bundleComments: '/bundles/detail/comments',
    // 상세의 번치 이름 → 번치 화면: 격자 zoom 규칙 대신 새 화면으로 들어가는 drill을 쓰려고 이동 직전에 상세 틀의 전환 id를 바꿈
    bundleToBunch: '/bundles/detail/to-bunch',
    bundleVisibility: '/bundles/visibility',
    bundleEdit: '/bundles/edit',
    bundleEditPhotoAdd: '/bundles/edit/photo-add',
    bundleEditPhotoViewer: '/bundles/edit/photo-viewer',
    member: '/members/profile',
  },
} as const;

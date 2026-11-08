export const BUNCH_HOME_PATHS = {
  /** 번치 탭(페이지 전환 등록 이름) */
  home: '/bunch',
  /** 번들 만들기 사진 선택 화면(번들 작성 흐름의 시작, 「+」·「첫 번들 만들기」에서 들어감) */
  createBundle: '/bunch/bundles/new',
  /** 작성 중인 번들 공동 편집(작성) 화면(번치 홈 「작성 중인 번들」 카드에서 들어감) */
  draft: (draftId: string) => `/bunch/drafts/${draftId}`,
  /** 더보기 메뉴(기능명세 5.4) */
  menu: '/bunch/menu',
  /** 번치 프로필 편집(기능명세 5.5, 메인 관리자) */
  profile: '/bunch/menu/profile',
  /** 메인 관리자의 새 관리자 지정 뒤 나가기(기능명세 5.8) */
  leave: '/bunch/menu/leave',
  /** 알림 목록(기능명세 5.12). 번치 홈 헤더 알림에서 들어감 */
  notifications: '/bunch/notifications',
  /** 번치 삭제 안내(기능명세 5.9, 메인 관리자) */
  delete: '/bunch/menu/delete',
  /** 번치 삭제 확인 문구 입력(화면설계서 2236:41816 2번) */
  deleteConfirm: '/bunch/menu/delete/confirm',
  /** 다른 번치 프로필(기능명세 5.10) */
  otherBunch: (bunchId: string) => `/bunches/${bunchId}`,
  /** 다른 번치 멤버 목록(화면설계서 2500:71333 4번) */
  otherBunchMembers: (bunchId: string) => `/bunches/${bunchId}/members`,
  /** 다른 번치 팔로워·팔로잉 목록(기능명세 5.11). 팔로잉 탭으로 열려면 followingTab */
  otherBunchFollows: (bunchId: string) => `/bunches/${bunchId}/follows`,
  /** 내 번치(지금 번치) 팔로워·팔로잉 목록(기능명세 5.11) */
  follows: '/bunch/follows',
  /** 내 번치의 대기 중인 팔로우 요청(화면설계서 2500:72664 2번) */
  followRequests: '/bunch/follows/requests',
  /** 차단 목록(기능명세 5.7) */
  blocked: '/bunch/menu/blocked',
  /** 멤버 관리(기능명세 5.6). 번치 홈 프로필의 멤버 수에서도 들어올 예정이라 메뉴 밖 경로 */
  members: '/bunch/members',
  /** 역할별 권한 안내(화면설계서 1-1) */
  roles: '/bunch/members/roles',
  /** 콕한 장소(기능명세 8.1, 번치 홈 프로필의 「콕한 장소」 버튼, 화면은 bunch-places feature). URL 계약만 두고 feature는 import하지 않음 */
  places: '/bunch/places',
  /** 멤버 초대(멤버 관리 헤더·더보기 메뉴, 화면은 bunch-invite feature) */
  invite: '/bunch/members/invite',
  // 번치 추가는 번치 시작 선택 화면으로 이동(기능명세 5.2.4, 화면설계서 8). URL 계약만 두고 onboarding feature는 import하지 않음
  startBunch: '/onboarding?from=bunch',
  // 번치 없음(5.1.7)의 새 번치 만들기·초대 링크 참여. URL 계약만 두고 onboarding feature는 import하지 않음
  createBunch: '/onboarding/create',
  joinBunch: '/onboarding/join',
  // 다른 번치 프로필의 임시 입구(피드 탭). URL 계약만 두고 main-navigation feature는 import하지 않음
  feed: '/feed',
  /** 동적 route의 전환 경계 id(규칙과 각 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: {
    otherBunch: '/bunches/profile',
    otherBunchMembers: '/bunches/profile/members',
    otherBunchFollows: '/bunches/profile/follows',
  },
} as const;

/** 팔로워·팔로잉 목록을 팔로잉 탭으로 여는 주소(프로필의 「팔로잉」 수) */
export const followingTab = (followsPath: string) => `${followsPath}?tab=following`;

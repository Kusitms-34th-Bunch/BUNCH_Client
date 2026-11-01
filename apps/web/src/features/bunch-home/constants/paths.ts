export const BUNCH_HOME_PATHS = {
  /** 번치 탭(페이지 전환 등록 이름) */
  home: '/bunch',
  /** 더보기 메뉴(기능명세 5.4) */
  menu: '/bunch/menu',
  /** 번치 프로필 편집(기능명세 5.5, 메인 관리자) */
  profile: '/bunch/menu/profile',
  /** 차단 목록(기능명세 5.7) */
  blocked: '/bunch/menu/blocked',
  /** 멤버 관리(기능명세 5.6). 번치 홈 프로필의 멤버 수에서도 들어올 예정이라 메뉴 밖 경로 */
  members: '/bunch/members',
  /** 역할별 권한 안내(화면설계서 1-1) */
  roles: '/bunch/members/roles',
  /** 멤버 초대(멤버 관리 헤더·더보기 메뉴, 화면은 bunch-invite feature) */
  invite: '/bunch/members/invite',
  // 번치 추가는 번치 시작 선택 화면으로 이동(기능명세 5.2.4, 화면설계서 8). URL 계약만 두고 onboarding feature는 import하지 않음
  startBunch: '/onboarding?from=bunch',
} as const;

export const BUNCH_HOME_PATHS = {
  /** 번치 탭(페이지 전환 등록 이름) */
  home: '/bunch',
  /** 더보기 메뉴(기능명세 5.4) */
  menu: '/bunch/menu',
  /** 번치 프로필 편집(기능명세 5.5, 메인 관리자) */
  profile: '/bunch/menu/profile',
  // 번치 추가는 번치 시작 선택 화면으로 이동(기능명세 5.2.4, 화면설계서 8). URL 계약만 두고 onboarding feature는 import하지 않음
  startBunch: '/onboarding?from=bunch',
} as const;

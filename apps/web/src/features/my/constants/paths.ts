// MY 탭 아래 화면 경로. 상세 화면은 이어지는 MY 이슈에서 만들고, 그전까지 메뉴는 경로만 연결
export const MY_PATHS = {
  /** 개인 프로필 수정(화면 설계서 MY(1)) */
  profile: '/my/profile',
  /** 알림 설정(화면 설계서 MY(3)) */
  notifications: '/my/notifications',
  /** 서비스 이용약관·개인정보 처리방침(화면 설계서 MY(4)) */
  termsOfService: '/my/terms/service',
  privacyPolicy: '/my/terms/privacy',
  /** 회원 탈퇴(화면 설계서 MY(5)) */
  withdrawal: '/my/withdrawal',
} as const;

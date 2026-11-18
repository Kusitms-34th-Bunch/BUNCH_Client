// MY 탭 아래 화면 경로. 아직 화면이 없는 경로는 이어지는 MY 이슈에서 만들고, 그전까지 메뉴는 경로만 연결
export const MY_PATHS = {
  /** MY 탭(하단 탭 경로와 같은 값, 프로필 수정 뒤 돌아갈 곳) */
  home: '/my',
  /** 개인 프로필 수정(화면 설계서 MY(1)) */
  profile: '/my/profile',
  /** 알림 설정(화면 설계서 MY(3)) */
  notifications: '/my/notifications',
  /** 약관 및 개인정보: 약관 원문 이동과 추가 개인정보 수집 동의(화면 설계서 MY(4)) */
  termsAndPrivacy: '/my/terms',
  /** 약관 원문 화면 */
  termsOfService: '/my/terms/service',
  privacyPolicy: '/my/terms/privacy',
  demographicsTerms: '/my/terms/demographics',
  /** 회원 탈퇴(화면 설계서 MY(5)) */
  withdrawal: '/my/withdrawal',
  /** 탈퇴 전 관리자 권한 이전(화면 설계서 MY(5) 4~5번) */
  withdrawalTransfer: '/my/withdrawal/transfer',
  /** 로그아웃 뒤 이동할 로그인 화면. URL 계약만 두고 auth feature는 import하지 않음 */
  login: '/login',
  /** 동적 route의 전환 경계 id(규칙과 화면 DOM의 data-ssgoi-transition에 함께 사용). 실제 URL이 아님 */
  transitionIds: { terms: '/my/terms/document' },
} as const;

/** 문의하기 「열기」로 여는 카카오톡 채널 친구 추가 화면 */
export const MY_CONTACT_URL = 'https://pf.kakao.com/_QpxnxeX/friend';

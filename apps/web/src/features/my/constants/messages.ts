export const MY_MESSAGES = {
  title: 'MY',
  profileEdit: '프로필 수정',
  sections: { notifications: '알림', terms: '약관 및 정책', support: '고객지원' },
  menu: {
    notifications: '알림 설정',
    termsOfService: '서비스 이용약관',
    privacyPolicy: '개인정보 처리방침',
    contact: '문의하기',
    logout: '로그아웃',
    withdrawal: '탈퇴하기',
  },
  // 개인 프로필 수정(화면 설계서 MY(1) 7·8번)
  profileEditTitle: '개인 프로필 수정',
  profileEditSubmit: '프로필 수정하기',
  profileEdited: '프로필을 수정했어요.',
  // 알림 설정(화면 설계서 MY(3))
  notifications: {
    title: '알림 설정',
    push: { title: '앱 푸시 알림', description: '푸시를 꺼도 앱 알림 목록에는 그대로 쌓여요.' },
    typesLabel: '받을 알림',
    types: {
      bundle: {
        title: '번들 소식',
        description: '번들 추천부터 제작, 업로드까지의 소식을 알려줘요.',
      },
      growth: { title: '뭉치 성장', description: '뭉치가 새로운 모습으로 변하면 알려줘요.' },
      member: {
        title: '멤버 및 권한 소식',
        description: '번치의 멤버 구성과 역할이 바뀌면 알려줘요.',
      },
      follow: { title: '팔로우', description: '팔로우와 관련된 새로운 소식을 알려줘요.' },
      reaction: { title: '좋아요 및 댓글', description: '우리 번들에 남긴 반응을 알려줘요.' },
    },
    deviceOff: '알림 설정이 꺼져 있어요.',
    openDeviceSettings: '설정으로 이동',
  },
} as const;

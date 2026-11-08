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
  // 문의하기·로그아웃 확인 창(화면 설계서 MY(4) 3·4번)
  contact: {
    title: "'카카오톡'에서 열기",
    description: '오픈채팅 상담 채널로 이동해요.',
    confirm: '열기',
  },
  logout: {
    title: '로그아웃할까요?',
    confirm: '로그아웃',
    // 기능명세서 7.5.2 예외 처리
    failed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  },
  cancel: '취소',
  // 회원 탈퇴(화면 설계서 MY(5))
  withdrawal: {
    title: '탈퇴하기 전에 확인해 주세요',
    description: '회원 탈퇴 시 아래 내용이 적용되며, 복구할 수 없어요.',
    deletedTitle: '삭제되는 정보',
    deleted: [
      {
        title: '계정과 개인정보',
        description: '닉네임, 프로필 사진 등 계정 정보가 영구 삭제돼요.',
      },
      {
        title: '사진함에 올린 내 사진',
        description: '모든 번치의 사진함에서 내가 올린 사진이 삭제돼요.',
      },
      { title: '작성 중인 번들', description: '내가 최초로 생성한 작성 중인 번들이 삭제돼요.' },
      {
        title: '번들 속 코멘트',
        description: '내 이름은 ‘작성자’로 표시되고, 작성한 코멘트는 숨겨져요.',
      },
      { title: '댓글', description: '내 이름은 ‘작성자’로 표시되고, 작성한 댓글은 숨겨져요.' },
    ],
    keptTitle: '남는 기록',
    kept: [{ title: '번들', description: '업로드된 번들과 번들 속 사진은 그대로 남아요.' }],
    agree: '안내 사항을 모두 확인했어요.',
    next: '다음',
    confirmTitle: '정말 탈퇴하시겠어요?',
    confirmDescription: '계정이 영구 삭제되며, 복구할 수 없어요.',
    confirm: '탈퇴하기',
    ownerTitle: '관리자로 있는 번치가 있어요',
    ownerDescription: '번치의 관리자 권한을 다른 멤버에게 넘긴 뒤 탈퇴할 수 있어요.',
    ownerTransfer: '권한 넘기러 가기',
    // 기능명세서 7.6.4 예외 처리
    failed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  },
  // 관리자 권한 이전(화면 설계서 MY(5) 4~5번). 화면 제목은 Figma에 없어 낭독용
  transfer: {
    title: '관리자 권한 넘기기',
    members: '멤버',
    coOwner: '공동 관리자',
    // 고른 뒤 접힌 번치 카드에 붙여 읽는 문구(색만으로 전하지 않음)
    selected: (name: string) => `새 관리자: ${name}`,
    next: '다음',
    // 「다음」이 막힌 이유와 남은 번치 수(낭독용, Figma에 보이는 문구 없음)
    progress: (picked: number, total: number) =>
      picked === total
        ? '모든 번치의 새 관리자를 골랐어요.'
        : `모든 번치에서 새 관리자를 골라 주세요. ${total}개 중 ${picked}개 골랐어요.`,
  },
  // 개인 프로필 수정(화면 설계서 MY(1) 7·8번)
  profileEditTitle: '개인 프로필 수정',
  profileEditSubmit: '프로필 수정하기',
  profileEdited: '프로필을 수정했어요.',
  // 바꾼 내용이 있는데 뒤로 가기(기능명세서 7.2.1 상세 7)
  profileLeave: {
    title: '저장하지 않고 나갈까요?',
    description: '변경한 내용이 반영되지 않아요.',
    confirm: '나가기',
  },
  // 알림 설정(화면 설계서 MY(3))
  notifications: {
    title: '알림 설정',
    push: { title: '앱 푸시 알림', description: '푸시를 꺼도 앱 알림 목록에는 그대로 쌓여요.' },
    typesLabel: '받을 알림',
    // 받을 알림을 모두 꺼 앱 푸시가 꺼졌을 때 낭독(Figma에 보이는 문구 없음)
    pushAutoOff: '받을 알림을 모두 꺼서 앱 푸시 알림도 꺼졌어요.',
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

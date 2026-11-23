/** 둘 이상의 feature가 같은 뜻으로 쓰는 문구. 각 feature는 상황별 key를 두고 값만 여기서 가져옴(한 상황만 바뀌면 그 key만 고침) */
export const COMMON_MESSAGES = {
  temporaryFailure: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  leaveWithoutSavingTitle: '저장하지 않고 나갈까요?',
  leaveWithoutSavingDescription: '변경한 내용이 반영되지 않아요.',
  permissionChanged: '권한이 변경되어 해당 기능을 이용할 수 없어요.',
  needMembersTitle: '함께할 멤버가 없어요',
  followRequestCanceled: '팔로우 요청을 취소했어요.',
  bunchLimit: '참여할 수 있는 번치는 최대 10개예요.',
  draftDeleted: '작성 중인 번들을 삭제했어요.',
  invalidInvitation: '유효하지 않은 링크입니다.',
  visibilityMembersDescription: '우리 번치 멤버만 볼 수 있어요',
  notificationsUnread: '알림, 읽지 않은 알림 있음',
  reported: '신고가 접수됐어요.',
  deletedPhoto: '삭제된 사진이에요',
  nameCharactersInvalid: '특수문자를 제외한 영문, 한글만 사용할 수 있어요.',
} as const;

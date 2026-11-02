import type { BunchSummary } from '../lib/types';

// 마지막 글자에 받침이 있으면 「을」, 없거나 한글이 아니면 「를」(퇴근런클럽을, 여행가조를)
// ponytail: 영문·숫자로 끝나는 이름은 발음과 상관없이 「를」, 발음 규칙이 필요하면 그때 확장
const objectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
};

export const BUNCH_HOME_MESSAGES = {
  switched: (bunchName: string) => `${bunchName} 번치로 전환했어요.`,
  completedEmptyTitle: '추억은 많은데, 번들은 아직!',
  draftEmptyTitle: '아직 작성 중인 번들이 없어요',
  emptyDescription: '함께한 순간을 하나의 기록으로 남겨보세요.',
  deleteDraftTitle: '작성 중인 번들을 삭제할까요?',
  deleteDraftDescription:
    '삭제한 번들은 다시 복구할 수 없지만, 사용된 사진은 사진함에 그대로 남아요.',
  unavailableTitle: ({ name, access }: BunchSummary) =>
    access === 'deleted' ? `${name} 번치가 삭제됐어요` : `${name} 번치에서 내보내졌어요`,
  unavailableDescription: ({ access }: BunchSummary) =>
    access === 'deleted'
      ? '관리자가 번치를 삭제하여 더 이상 접근할 수 없어요.'
      : '번치 멤버 목록에서 제외되어 더 이상 번치에 참여할 수 없어요.',
  profileSaved: '번치 프로필을 수정했어요.',
  publicNotice:
    '팔로워에게만 공개되던 번들을 누구나 볼 수 있게 되며, 대기 중인 팔로우 요청은 모두 승인돼요.',
  leaveTitle: (bunchName: string) => `${bunchName} 번치를 나갈까요?`,
  leaveDescription:
    '사진함에 직접 올린 사진은 삭제되지만, 이미 발행된 번들의 사진은 그대로 남아요.',
  // 멤버 관리(화면설계서 2198:42965 2~4번)
  appointTitle: (name: string) => `${name}님을 공동 관리자로 지정할까요?`,
  appointDescription: '번치를 함께 관리할 수 있어요.',
  appointed: (name: string) => `${name}님이 공동 관리자가 되었어요.`,
  revokeTitle: (name: string) => `${name}님의 공동 관리자 권한을 해제할까요?`,
  revokeDescription: '해제 시 일반 멤버로 바뀌어요.',
  revoked: (name: string) => `${name}님의 공동 관리자 권한을 해제했어요.`,
  transferTitle: (name: string) => `${name}님에게 관리자 권한을 넘길까요?`,
  transferDescription: '넘긴 뒤에는 일반 멤버로 번치에 남아요.',
  transferred: (name: string) => `${name}님이 관리자가 되었어요.`,
  removeTitle: (name: string, bunchName: string) => `${name}님을 ${bunchName}에서 내보낼까요?`,
  removeDescription: (name: string) =>
    `${name}님이 올리신 사진은 사진함에서 삭제되고, 발행된 번들에만 남아요.`,
  removed: (name: string) => `${name}님을 번치에서 내보냈어요.`,
  // 번치 나가기(화면설계서 2236:40773)
  left: (bunchName: string) => `${bunchName} 번치를 나왔어요.`,
  transferredAndLeft: (name: string) => `${name}님을 관리자로 지정하고 나갔어요.`,
  aloneTitle: '혼자 있는 번치는 나갈 수 없어요',
  aloneDescription: '더 이상 사용하지 않는 번치는 삭제할 수 있어요.',
  leaveTransferTitle: '관리자 권한을 넘길 멤버를 정해주세요.',
  leaveTransferDescription: '선택한 멤버가 새로운 관리자가 돼요.',
  // 알림 목록(Figma 1892:36947)
  notificationSettingsNudge: '알림 받기를 설정하고 유용한 알림을 받아보세요.',
  readAllDone: '모든 알림을 읽음으로 바꿨어요.',
  nothingToRead: '읽지 않은 알림이 없어요.',
  // 번치 삭제(화면설계서 2236:41816)
  deleteTitle: (bunchName: string) => `${bunchName}${objectParticle(bunchName)} 삭제할까요?`,
  deletedItems: ['사진함 속 사진', '작성 중이거나 발행된 번들', '팔로우・좋아요・댓글'],
  deleteWarning: [
    '번치를 삭제하면 모든 활동 내역이 영구적으로 삭제되며,',
    '어떠한 경우에도 복구할 수 없어요.',
  ],
  deleteConfirmTitle: '정말 삭제할까요?',
  deleteConfirmDescription: "확인을 위해 아래에 '삭제하기'를 입력해주세요.",
  deleteConfirmPhrase: '삭제하기',
  // 앞의 「*」는 화면이 장식으로 붙임(스크린 리더에서 「별표」로 읽히지 않게)
  deleteConfirmHint: '‘삭제하기’를 정확히 입력하면 삭제 버튼이 활성화돼요.',
  deleted: (bunchName: string) => `${bunchName} 번치를 삭제했어요.`,
  // 다른 번치 프로필(화면설계서 2500:68583)
  privateBunchTitle: '비공개 번치예요',
  privateBunchDescription: '번들을 보려면 이 번치를 팔로우하세요.',
  followingPublic: '공개 번치',
  followingPrivate: '비공개 번치',
  requestPending: '요청 대기 중인 비공개 번치',
  unfollowQuestion: '팔로우를 취소할까요?',
  cancelRequestQuestion: '팔로우 요청을 취소할까요?',
  followed: (bunchName: string) => `${bunchName} 번치를 팔로우했어요.`,
  followRequested: (bunchName: string) => `${bunchName} 번치에 팔로우를 요청했어요.`,
  unfollowed: (bunchName: string) => `${bunchName} 번치 팔로우를 취소했어요.`,
  requestCanceled: (bunchName: string) => `${bunchName} 번치 팔로우 요청을 취소했어요.`,
  noBunchTitle: '참여 중인 번치가 없어요',
  noBunchDescription: '새 번치를 만들거나 초대받은 번치에 참여해보세요.',
  // 차단 목록(화면설계서 2236:40175 2~3번)
  unblockTitle: (bunchName: string) => `${bunchName} 차단을 해제할까요?`,
  unblockDescription: '서로의 번들과 프로필을 볼 수 있어요. 팔로우는 자동으로 돌아오지 않아요.',
  unblocked: (bunchName: string) => `${bunchName} 번치를 차단 해제했어요.`,
  blockedEmptyTitle: '아직 차단한 번치가 없어요',
  blockedEmptyDescription:
    '차단은 번치 멤버 모두에게 적용되며,\n서로의 번들・프로필・댓글은 보이지 않아요.',
} as const;

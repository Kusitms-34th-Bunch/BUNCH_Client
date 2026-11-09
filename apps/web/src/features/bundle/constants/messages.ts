/** 번들 작성 화면의 사용자 안내 문구(기획 문서 docs/specs/bundle-create.md 4.3) */
export const BUNDLE_MESSAGES = {
  headerSaved: '저장 완료',
  headerSaving: '저장 중',
  headerSaveFailed: '저장 실패',
  upload: '업로드',
  offlineBanner: '인터넷 연결을 확인해 주세요.',
  offlineRetry: '재시도',
  membersTitle: '참여 멤버',
  titleLabel: '번들 제목',
  titlePlaceholder: '번들 제목을 입력해주세요.',
  titleMax: '제목은 40자까지 쓸 수 있어요.',
  // 사진 제목 옆 「픽하기 >」: 대표 사진 투표 화면으로(Figma `5367:146358`)
  // 코멘트 카드 아래 안내 문구(Figma `5730:142491`, 별표 한 칸 뒤 문구)
  commentsNotice: '코멘트와 픽하기는 업로드 이후 수정이 불가해요',
  pickLink: '픽하기',
  // 대표 사진 투표 화면(Figma `5699:103571`~`103708`)
  pickTitle: '마음에 드는 사진을 픽해보세요',
  pickNotice: '번들이 업로드되면 누가 픽했는지 보여요.',
  pickPhotos: '번들 사진',
  pickCarousel: '사진 넘기기, 좌우 방향키로 이동',
  pickedByMe: ' (나)',
  pickButton: '이 사진 픽하기',
  pickedButton: '사진을 픽했어요',
  pickedCount: (count: number) => `${count}명이 픽했어요`,
  pickDeletedTitle: '삭제된 사진이에요',
  pickDeletedDescription: '삭제된 사진은 픽할 수 없어요.',
  photoCount: (count: number) => `사진 ${count}장`,
  photosTitle: '사진',
  captionPlaceholder: '캡션 추가...',
  locationAdd: '위치 추가',
  locationField: '위치',
  dateAdd: '날짜 추가',
  dateField: '날짜',
  commentsTitle: '코멘트',
  commentMax: '코멘트는 400자까지 쓸 수 있어요.',
  visibilityTitle: '공개 범위',
  visibilityMembers: '멤버 공개',
  visibilityPublic: '공개',
  visibilityHelp: '공개 범위 설명',
  // 공개 범위 툴팁 원문(Figma `2255:43328`)
  visibilityTooltip: '비공개 번치에서 번들을 공개로 업로드하면 팔로워만 볼 수 있어요.',
  leaveQuestion: '작성중인 번들에서 나갈까요?',
  leave: '나가기',
  // 작성 중 번들이 없어졌을 때의 안내 창(Figma `5618:81986`·`81997`)
  deletedDraftTitle: '번들이 삭제됐어요',
  deletedDraftDescription: '작성 중이던 번들이 삭제되어 더 이상 편집할 수 없어요.',
  publishedDraftTitle: '번들이 업로드됐어요',
  // 시안은 「○○님이」로 업로드한 멤버 이름을 보이지만 초안 응답에 그 정보가 없어 이름 없이 안내
  publishedDraftDescription: '다른 멤버가 번들을 업로드해 더 이상 편집할 수 없어요.',
  missingDraftConfirm: '확인',
  // 서버 저장·발행 실패 안내(서버 연동 때 추가한 문구)
  fieldLocked: '다른 멤버가 편집 중이라 저장하지 못했어요.',
  saveFailed: '저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
  publishFailed: '번들을 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.',
  publishConflict: '다른 멤버가 내용을 바꿨어요. 확인한 뒤 다시 업로드해 주세요.',
  published: '번들이 업로드되었어요.',
  editOnlyParticipants: '참여 멤버만 편집할 수 있어요',
  uploadForbidden: '번치 관리자와 해당 번들 생성자만 업로드할 수 있어요.',
  // 사진 빼기·이동·추가를 서버에 보내지 못했을 때의 임시 안내(기획 원문 없음)
  photosChangeFailed: '사진 구성을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.',
  uploadUnsaved: '저장하지 못한 내용이 있어요. 내용을 다시 바꾸면 저장을 다시 시도해요.',
  uploadSaving: '저장이 끝난 뒤에 업로드할 수 있어요.',
  uploadIncomplete: '필수 항목을 모두 입력해야 업로드 할 수 있어요.',
  // 스스로 나가기 확인 창 문구는 Figma Dialog `2082:49691`·기능명세서 4.3.2 원문(초안 생성자도 같은 문구)
  leaveConfirmTitle: '번들에서 나가시겠어요?',
  // 초안 생성자가 나갈 때는 번들이 삭제됨을 알림(Figma `5699:106127`)
  leaveCreatorTitle: '번들에서 나갈까요?',
  leaveCreatorDescription: '번들을 만든 멤버가 나가면 번들이 삭제되고,\n되돌릴 수 없어요.',
  // 「삭제되며,」 뒤에서 줄이 바뀜
  leaveConfirmDescription: '번들에서 나가면 작성한 코멘트가 삭제되며,\n복구할 수 없어요.',
  // 업로드 확인 창 문구는 기획 전달 원문(기능 spec 4.3.12의 질문 + 설명)
  uploadConfirmTitle: '번들을 업로드할까요?',
  uploadConfirmDescription: '업로드 이후에는 관리자만 수정할 수 있어요.',
  // 다른 멤버가 편집 중일 때의 업로드 확인 창(기획 전달 원문, 업로드는 막지 않음)
  // Figma 작성 화면 더보기 메뉴(`5699:105934`): 번들 나가기는 헤더 ⋯로 옮김
  menuLabel: '번들 메뉴',
  menuOpenLabel: '더보기',
  leaveMenuItem: '번들 나가기',
  uploadEditingContinue: '계속하기',
  // Figma 공개 범위 화면(`5699:105991`·`106016`·`106041`)
  visibilityScreenTitle: '번들의 공개 범위를 설정해 주세요',
  visibilityAll: '전체 공개',
  visibilityAllDescription: '번치의 모든 사용자가 볼 수 있어요',
  visibilityPartial: '일부 공개',
  visibilityPartialDescription: '우리 번치의 팔로워도 볼 수 있어요',
  visibilityMembersDescription: '우리 번치 멤버만 볼 수 있어요',
  visibilityNotice: '* 업로드 이후에는 관리자만 수정하거나 삭제할 수 있어요.',
  uploading: '업로드 중',
  visibilityRequired: '공개 범위를 선택해 주세요.',
  uploadEditingTitle: '편집 중인 멤버가 있어요',
  uploadEditingDescription: '지금 업로드하면 작성 중인 내용 일부가 반영되지 않을 수 있어요.',
  cancel: '취소',
  // 멤버 내보내기 확인 창은 Figma 「멤버 삭제 프로토타입」 `2091:62913` 원문
  removeMemberTitle: (name: string) => `${name}님을 번들에서 내보낼까요?`,
  removeMemberDescription: (name: string) =>
    // 「삭제되며,」 뒤에서 줄이 바뀜
    `${name}님이 남긴 코멘트가 삭제되며,\n복구할 수 없어요.`,
  removeMemberConfirm: '내보내기',
  memberRemoved: (name: string) => `${name}님이 번들 참여 멤버에서 제외되었어요.`,
  memberAdded: (name: string) => `${name}님이 번들 참여 멤버에 추가되었어요.`,
  // 참여 멤버 관리 화면(기능 spec 4.3.2)
  addMembersTitle: '멤버 추가하기',
  addMemberButton: '추가하기',
  addMemberLabel: (name: string) => `${name} 추가하기`,
  removeMemberLabel: (name: string) => `${name} 내보내기`,
  leaveMemberLabel: '번들에서 나가기',
  selfSuffix: '(나)',
  // 초안 생성자가 나가면 작성 중인 번들이 삭제되어 알림(확인 창 문구는 일반 멤버와 같음)
  draftDeleted: '작성 중인 번들을 삭제했어요.',
  // 기획 원문 없는 임시 안내: 나가기를 서버에 보내지 못했을 때
  leaveFailed: '번들에서 나가지 못했어요. 잠시 후 다시 시도해 주세요.',
  // 다른 멤버가 편집 중인 영역을 눌렀을 때 토스트(Figma `2060:37684`)
  editingBlocked: '다른 멤버가 편집 중일 땐 수정할 수 없어요.',
  editingLabel: (name: string) => `${name}님이 편집 중`,
  commentEditingLabel: (name: string) => `${name}님이 작성 중`,
  roleLabel: { owner: '번치장', coOwner: '공동 번치장', draftAuthor: '초안 작성자' },
  // 위치 순서 바꾸기(햄버거 핸들을 잡고 끌기, Figma `5367:146358`)
  locationReorderLabel: (name: string) => `${name} 순서 바꾸기`,
  locationDragInstructions:
    '순서를 바꾸려면 Space로 잡고 위아래 방향키로 옮긴 뒤 Space로 놓으세요. Esc로 취소해요.',
  locationDragStart: (name: string) => `${name} 위치를 잡았어요.`,
  locationDragOver: (position: number, total: number) => `${total}곳 중 ${position}번째 자리예요.`,
  locationDragEnd: (position: number, total: number) => `${total}곳 중 ${position}번째로 옮겼어요.`,
  locationDragCancel: '순서 바꾸기를 취소했어요.',
  locationSheetTitle: '위치 검색',
  locationSearchLabel: '장소나 주소 검색',
  locationSearchPlaceholder: '장소나 주소를 검색해 주세요',
  locationGuideTitle: '태그한 위치는 함께 보여요',
  // Figma 줄바꿈 위치(「해당 게시글을」 뒤)를 \n으로 유지
  locationGuideDescription:
    '게시글에 태그한 위치는 해당 게시글을\n보는 다른 사람들에게도 표시돼요.',
  locationNoResult: '검색 결과가 없어요',
  locationResultCount: (count: number) => `검색 결과 ${count}건`,
  searchFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  // 사진 상세(캡션 화면·크게 보기, 기능 spec 4.3.4~4.3.6, Figma `1782:32837`·`2082:49108`·`2091:61896`)
  captionLabel: '사진 캡션',
  captionTooLong: '캡션은 200자까지 쓸 수 있어요',
  photoPosition: (current: number, total: number) => `${total}장 중 ${current}번째 사진`,
  photoOpenLabel: (current: number) => `${current}번째 사진 상세 보기`,
  photoCaptionTitle: '번들 사진',
  photoViewerTitle: '사진 크게 보기',
  photoViewLabel: (current: number) => `${current}번째 사진 크게 보기`,
  removePhotoLabel: (current: number) => `${current}번째 사진 빼기`,
  photoRemoved: (left: number) => `사진을 뺐어요. ${left}장이 남았어요.`,
  movePhotoBefore: '사진을 앞으로 옮기기',
  movePhotoAfter: '사진을 뒤로 옮기기',
  photoMoved: (position: number, total: number) => `${total}장 중 ${position}번째로 옮겼어요.`,
  photoDragStart: '사진을 끌고 있어요.',
  photoDragCancel: '끌기를 취소했어요.',
  removePhotoBlockedTitle: '사진을 삭제할 수 없어요',
  removePhotoBlockedDescription: '번들에는 최소 1장의 사진이 있어야 해요.',
  removePhotoBlockedConfirm: '확인',
  removeConfirmTitle: '사진을 삭제할까요?',
  removeConfirmDescription: '사진과 작성한 캡션이 모두 삭제돼요.',
  removeConfirmConfirm: '삭제하기',
  photoDeleted: '사진함에서 삭제된 사진이에요.',
  // 사진 추가 화면(기능 spec 4.3.7, Figma `1782:33283`·`2060:38500`·`1782:32859`·`2091:62148`)
  photoAddTitle: '사진 추가',
  photoAddApply: '적용하기',
  photoAddApplied: '변경사항이 적용되었어요.',
  photoAddRemoveTitle: (count: number) => `사진 ${count}장이 번들에서 빠져요`,
  photoAddRemoveDescription: '빠진 사진의 캡션도 함께 지워져요.',
  photoAddLeaveTitle: '저장하지 않고 나갈까요?',
  photoAddLeaveDescription: '변경한 내용이 반영되지 않아요.',
  photoAddLeaveConfirm: '나가기',
} as const;

/** 위치를 담을 수 있는 최대 개수(Figma 수정 가이드: 3개가 차면 「추가」 행이 사라짐) */
export const MAX_LOCATIONS = 3;
export const TITLE_MAX_LENGTH = 40;
export const COMMENT_MAX_LENGTH = 400;
/** 캡션 최대 글자 수와 번들 한 개에 담을 수 있는 사진 수(기능 spec 4.3.4·4.3.7) */
export const CAPTION_MAX_LENGTH = 200;
export const MAX_PHOTOS = 20;

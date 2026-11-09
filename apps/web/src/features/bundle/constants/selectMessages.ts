/** 번들 만들기 사진 선택·추천 번들 화면의 사용자 안내 문구(기획 문서 docs/specs/bundle-create.md 4.1~4.2, Figma 설계서 `1998:28015`) */
export const BUNDLE_SELECT_MESSAGES = {
  title: '번들 만들기',
  next: '다음',
  previous: '이전',
  // Figma 사진 선택 헤더 오른쪽 텍스트 버튼
  viewRecommend: '추천 번들 보기',
  // Figma 멤버 선택 화면(`5664:99697`·`99724`)
  membersTitle: '누구와 함께 만들까요?',
  memberAdd: '추가하기',
  memberAdded: '추가됨',
  // 음성 제어가 보이는 글자(추가하기·추가됨)로 부를 수 있게 이름이 보이는 글자로 시작
  memberAddLabel: (name: string, added: boolean) => `${added ? '추가됨' : '추가하기'}, ${name}`,
  memberRoleLabel: { owner: '번치장', coOwner: '공동 관리자' },
  membersStatus: (count: number) => (count === 0 ? '추가한 멤버가 없어요.' : `${count}명 추가됨`),
  back: '뒤로 가기',
  // Figma: 두 줄로 나뉘는 시트 제목(「추천 사진으로」 뒤에서 줄바꿈)
  sheetTitle: '추천 사진으로\n빠르게 번들을 만들어보세요!',
  sheetLabel: '추천 번들',
  emptyTitle: '아직 추천할 번들이 없어요',
  emptyDescription: '함께한 순간이 쌓이면 번들을 추천해 드릴게요.',
  maxPhotos: '번들에는 사진을 20장까지 담을 수 있어요.',
  applied: (count: number) => `추천 번들 사진 ${count}장이 선택되었어요.`,
  // Figma 변경 확인 모달 `2060:45262`
  changeTitle: '추천 번들 사진으로 변경할까요?',
  changeDescription: '기존 사진 선택이 해제되고, 추천 번들 사진이 새롭게 선택돼요.',
  changeConfirm: '변경하기',
  cancel: '취소',
  deletedRecommendation: '추천 번들이 삭제됐어요. 다시 확인해 주세요.',
  detailTitle: (title: string) => `${title} 상세`,
  viewerTitle: '사진 보기',
  creating: '번들을 만들고 있어요.',
  // 초안 생성 실패 안내(기획 4.1.3), 번치 인원 부족·초안 한도는 같은 오류 코드라 번치 멤버 수로 구분
  membersRequired: '번들은 멤버가 2명 이상일 때 만들 수 있어요. 멤버를 초대해 주세요.',
  draftLimit: '번들 초안은 최대 10개까지 만들 수 있어요. 기존 초안을 발행하거나 삭제해 주세요.',
  selectionStale: (count: number) =>
    `선택한 사진 중 ${count}장이 사진함에서 삭제되어 선택이 해제됐어요.`,
  createFailed: '번들을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  selectionStatus: (count: number) => (count === 0 ? '선택한 사진이 없어요.' : `${count}장 선택됨`),
  photoPosition: (current: number, total: number) => `${total}장 중 ${current}번째 사진`,
} as const;

/** 번들 하나에 담을 수 있는 최대 사진 수(기획 4.1.2). 사진함 「번들 만들기」와 같은 값 */
export const MAX_SELECT_PHOTOS = 20;
/** 추천 번들 카드에서 칩을 이만큼까지 보이고 넘치면 마지막 칩을 「○○ 외 N명」으로 줄임 */
export const MAX_RECOMMEND_CHIPS = 5;

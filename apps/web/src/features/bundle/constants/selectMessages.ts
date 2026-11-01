/** 번들 만들기 사진 선택·추천 번들 화면의 사용자 안내 문구(기획 문서 docs/specs/bundle-create.md 4.1~4.2, Figma 설계서 `1998:28015`) */
export const BUNDLE_SELECT_MESSAGES = {
  title: '번들 만들기',
  create: '번들 만들기',
  recommend: '추천 번들',
  apply: '적용하기',
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
  selectionStatus: (count: number) => (count === 0 ? '선택한 사진이 없어요.' : `${count}장 선택됨`),
  photoPosition: (current: number, total: number) => `${total}장 중 ${current}번째 사진`,
} as const;

/** 번들 하나에 담을 수 있는 최대 사진 수(기획 4.1.2). 사진함 「번들 만들기」와 같은 값 */
export const MAX_SELECT_PHOTOS = 20;
/** 추천 번들 카드에서 칩을 이만큼까지 보이고 넘치면 마지막 칩을 「○○ 외 N명」으로 줄임 */
export const MAX_RECOMMEND_CHIPS = 5;

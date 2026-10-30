/** 사진함 선택·메뉴 흐름의 사용자 안내 문구(기획 문서 docs/specs/photo-box.md 3.3) */
export const PHOTO_BOX_MESSAGES = {
  maxSelection: '사진은 한 번에 50장까지 고를 수 있어요.',
  saveDone: '이미지 저장이 완료되었어요.',
  saveFailedAll: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  saveFailedSome: (count: number) => `${count}장은 저장하지 못했어요. 다시 시도해 주세요.`,
  bundleTooMany: '번들에는 사진을 20장까지 담을 수 있어요.',
  bundleConfirmTitle: '이 사진들로 번들을 만들까요?',
  deleteForbidden: '내가 올린 사진만 삭제할 수 있어요.',
  deleteConfirmTitle: (count: number) => `선택한 사진 ${count}장을 삭제할까요?`,
  deleteConfirmDescription: '삭제 이후에는 복구할 수 없어요.',
  deleteDone: (count: number) => `사진함에서 사진 ${count}장이 삭제되었어요.`,
  selectionStale: (count: number) =>
    `선택한 사진 중 ${count}장이 사진함에서 사라져 선택이 해제됐어요.`,
} as const;

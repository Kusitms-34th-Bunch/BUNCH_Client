import type { DeleteKind } from '../lib/photoActions';

/** 사진함 선택·메뉴 흐름의 사용자 안내 문구(기획 문서 docs/specs/photo-box.md 3.3) */
export const PHOTO_BOX_MESSAGES = {
  maxSelection: '사진은 한 번에 50장까지 고를 수 있어요.',
  saving: '사진을 앨범에 저장하는 중이에요',
  selectionStatus: (count: number) => (count === 0 ? '선택 모드' : `${count}장 선택됨`),
  saveDone: '이미지 저장이 완료되었어요.',
  saveFailedAll: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  saveFailedSome: (count: number) => `${count}장은 저장하지 못했어요. 다시 시도해 주세요.`,
  bundleTooMany: '번들에는 사진을 20장까지 담을 수 있어요.',
  bundleConfirmTitle: '이 사진들로 번들을 만들까요?',
  bundleConfirmDescription: '작성 중인 번들에 담기고, 멤버들과 함께 완성할 수 있어요.',
  deleteFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  deleteForbidden: '내가 올린 사진만 삭제할 수 있어요.',
  deleteConfirmTitle: '선택한 사진을 삭제할까요?',
  // 사진 종류별 원문은 기획 문서에 없어 모든 종류가 같은 기본 문구를 씀(분기 구조는 getDeleteKind가 이미 제공)
  deleteConfirmDescription: (_kind: DeleteKind) => '삭제 이후에는 복구할 수 없어요.',
  deleteDone: (count: number) => `사진함에서 사진 ${count}장이 삭제되었어요.`,
  dateChanged: '사진 날짜가 변경되었어요.',
  dateChangeFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  deletedPhoto: '삭제된 사진이에요',
  detailPosition: (index: number, total: number) => `${total}장 중 ${index}번째 사진`,
  previousPhoto: '이전 사진',
  zoomIn: '사진 확대',
  zoomOut: '사진 축소',
  nextPhoto: '다음 사진',
  selectionStale: (count: number) =>
    `선택한 사진 중 ${count}장이 사진함에서 사라져 선택이 해제됐어요.`,
} as const;

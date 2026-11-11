import type { DeleteKind } from '../lib/photoActions';

/** 사진함 선택·메뉴 흐름의 사용자 안내 문구(기획 문서 docs/specs/photo-box.md 3.3) */
export const PHOTO_BOX_MESSAGES = {
  maxSelection: '사진은 한 번에 50장까지 고를 수 있어요.',
  saving: '사진을 앨범에 저장하는 중이에요',
  dragStart: '사진을 끌고 있어요.',
  dragCancel: '끌기를 취소했어요.',
  selectionStatus: (count: number) => (count === 0 ? '선택 모드' : `${count}장 선택됨`),
  saveDone: '이미지 저장이 완료되었어요.',
  saveFailedAll: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  saveFailedSome: (count: number) => `${count}장은 저장하지 못했어요. 다시 시도해 주세요.`,
  bundleTooMany: '번들에는 사진을 20장까지 담을 수 있어요.',
  bundleConfirmTitle: '이 사진들로 번들을 만들까요?',
  bundleConfirmDescription: '작성 중인 번들에 담기고, 멤버들과 함께 완성할 수 있어요.',
  deleteFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  // 이어 받다 실패했을 때(명세 3.1.1의 목록 로딩 실패 토스트와 같은 문구). 보이는 재시도 수단이 없는 짧은 목록에서도 알아챌 수 있게 함
  listMoreFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  // 기획에 원문이 없는 임시 문구: 삭제 뒤 목록을 다시 받지 못해 지운 사진이 남아 보일 수 있을 때
  listStale: '최신 사진 목록을 불러오지 못했어요. 사진함을 다시 열어 확인해 주세요.',
  deleteForbidden: '내가 올린 사진만 삭제할 수 있어요.',
  deleteConfirmTitle: '선택한 사진을 삭제할까요?',
  // 사진 종류별 원문은 기획 문서에 없어 모든 종류가 같은 기본 문구를 씀(분기 구조는 getDeleteKind가 이미 제공)
  deleteConfirmDescription: (_kind: DeleteKind) => '삭제 이후에는 복구할 수 없어요.',
  deleteDone: (count: number) => `사진함에서 사진 ${count}장이 삭제되었어요.`,
  dateChanged: '사진 날짜가 변경되었어요.',
  undo: '되돌리기',
  dateForbidden: '내가 올린 사진만 날짜를 바꿀 수 있어요.',
  // 날짜 바꾸기·끌기 확인 창 문구는 기획 문서에 원문이 없어 임시 문구(기획 확정 후 교체)
  dateConfirmTitle: '선택한 사진의 날짜를 바꿀까요?',
  dateConfirmDescription: '다른 멤버가 올린 사진이 포함되어 있어요.',
  bundleCreating: '번들을 만들고 있어요.',
  photoBoxFull: '사진함이 가득 찼어요.',
  uploadSheetTitle: (bunchName: string) => `${bunchName}에 사진 올리기`,
  dateChangeFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  deletedPhoto: '삭제된 사진이에요',
  loadingMore: '사진을 더 불러오는 중이에요',
  loadMore: '사진 더 불러오기',
  loadMoreFailed: '사진을 더 불러오지 못했어요',
  // 사진 올리기: 결과 문구는 lib/photoUpload.ts가 만들고, 여기에는 그 밖의 안내와 권한 모달 문구를 둠(기능명세서 3.2.2, 3.2.3)
  uploadUnavailable: '사진 올리기는 앱에서 할 수 있어요.',
  uploadNeedsUpdate: '앱을 최신 버전으로 업데이트해 주세요.',
  uploadFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
  uploadRetry: '다시 시도',
  // 올리는 동안 화면에는 진행 표시를 두지 않으므로(명세 3.2.2) 스크린 리더에게만 알리는 문구
  uploading: '사진을 올리는 중이에요.',
  cameraPermissionTitle: '권한 설정이 필요해요',
  cameraPermissionDescription:
    '카메라 접근 권한이 거부되어 있어요. 설정에서 직접 허용할 수 있어요.',
  openSettings: '설정 열기',
  detailPosition: (index: number, total: number) => `${total}장 중 ${index}번째 사진`,
  previousPhoto: '이전 사진',
  zoomIn: '사진 확대',
  zoomOut: '사진 축소',
  nextPhoto: '다음 사진',
  selectionStale: (count: number) =>
    `선택한 사진 중 ${count}장이 사진함에서 사라져 선택이 해제됐어요.`,
} as const;

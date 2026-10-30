export type PhotoBoxMember = {
  id: string;
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  avatarSrc?: string | undefined;
};

export type PhotoBoxBunch = {
  id: string;
  name: string;
  /** 번치 대표 이미지 주소 */
  imageSrc?: string | undefined;
};

/** 업로드 직후 처리 중이거나 이미지를 만들지 못한 사진은 회색 자리표시로 표시 */
export type PhotoStatus = 'ready' | 'processing' | 'failed';

export type PhotoBoxPhoto = {
  id: string;
  src: string;
  alt: string;
  /** 촬영 날짜·시각('YYYY-MM-DDTHH:mm', 사용자가 바꾼 날짜 우선). 날짜를 확인하지 못했으면 null */
  takenAt: string | null;
  /** 업로드 시각(ISO). 같은 촬영 시각이면 업로드 순으로 정렬 */
  uploadedAt: string;
  /** 올린 멤버(함께 올린 사진은 여러 명) */
  uploaderIds: readonly string[];
  status: PhotoStatus;
};

/** 지금 사진함을 보는 멤버. 삭제 권한과 확인 창 문구를 정하는 기준 */
export type PhotoBoxViewer = {
  memberId: string;
  /** 관리자(공동 관리자 포함)는 다른 멤버의 사진도 삭제할 수 있음 */
  isAdmin: boolean;
};

export type PhotoBoxData = {
  bunch: PhotoBoxBunch;
  viewer: PhotoBoxViewer;
  members: readonly PhotoBoxMember[];
  photos: readonly PhotoBoxPhoto[];
};

/** 사진함 화면 상태. API 연결 후에는 query 상태에서 변환 */
export type PhotoBoxState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'no-bunch' }
  | { kind: 'ready'; data: PhotoBoxData };

/** 멤버 필터에서 「전체」를 가리키는 값 */
export const ALL_MEMBERS = 'all';

export type SaveResult = {
  /** 앨범에 저장된 사진 id */
  savedIds: readonly string[];
  /** 저장하지 못한 사진 id */
  failedIds: readonly string[];
};

export type DeletePhotosResult = {
  /** 목록에서 사라진 사진 수(함께 올린 사진에서 내 이름만 빠진 경우는 세지 않음) */
  removedCount: number;
};

/**
 * 선택 모드 메뉴가 부르는 서버·기기 동작. 백엔드 명세 전에는 목 동작을 돌려주고, 연결하면 이 hook의 구현만 바꿈
 */
export type PhotoBoxActions = {
  /** 휴대폰 앨범에 저장(보관된 이미지 그대로, 함께 올린 사진은 1장) */
  savePhotos: (_ids: readonly string[]) => Promise<SaveResult>;
  /** 영구 삭제(휴지통 없음). 권한은 호출 전에 화면이 판단하고 서버가 다시 판단 */
  deletePhotos: (_ids: readonly string[]) => Promise<DeletePhotosResult>;
};

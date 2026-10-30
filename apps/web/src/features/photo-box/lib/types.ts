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

export type PhotoBoxData = {
  bunch: PhotoBoxBunch;
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

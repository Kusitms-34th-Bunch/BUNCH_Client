// 백엔드 API 명세의 응답 모양, ID는 서버 숫자(long)이고 화면 모델 변환은 endpoint 경계 담당

export type MemberRole = 'OWNER' | 'CO_OWNER' | 'MEMBER';

export type CharacterType = 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4';

export type MockMember = {
  memberId: number;
  nickname: string;
  imageUrl: string | null;
  birthYear: number | null;
  gender: 'FEMALE' | 'MALE' | null;
};

export type MockBunch = {
  id: number;
  name: string;
  characterType: CharacterType;
  imageUrl: string | null;
  introduction: string;
  /** 가짜 DB 내부 표현, 응답 값은 번치 홈 계약 확정 때 정함 */
  isPrivate: boolean;
};

export type MockMembership = {
  bunchId: number;
  memberId: number;
  role: MemberRole;
};

/** 같은 사진을 여러 멤버가 올리면 하나로 합쳐 올린 사람을 모두 기록 */
export type MockPhoto = {
  photoId: number;
  bunchId: number;
  uploaderIds: number[];
  /** 촬영 날짜('YYYY-MM-DD'), 날짜를 모르면 null */
  capturedDate: string | null;
  /** 촬영 시각('HH:mm:ss'), 시각을 모르면 null */
  capturedTime: string | null;
  thumbnailUrl: string;
  imageUrl: string;
};

export type BundleVisibility = 'PUBLIC' | 'PRIVATE';

/** 번들에 담긴 사진 한 장(번들 사진 ID와 사진함 원본 ID는 다름) */
export type MockBundlePhoto = {
  id: number;
  photoId: number | null;
  imageAssetId: number;
  imageUrl: string;
  position: number;
  addedBy: number;
  addedAt: string;
  caption: string;
  captionVersion: number;
  captionUpdatedBy: number | null;
  captionUpdatedAt: string | null;
};

export type MockBundleComment = {
  memberId: number;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/** 번들(초안·발행본). 필드마다 버전이 있고 revision은 내용이 바뀔 때마다 오름 */
export type MockBundle = {
  id: number;
  bunchId: number;
  createdBy: number;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  titleVersion: number;
  visibility: BundleVisibility | null;
  visibilityVersion: number;
  date: string | null;
  dateVersion: number;
  revision: number;
  photos: MockBundlePhoto[];
  participants: { memberId: number; joinedAt: string }[];
  comments: MockBundleComment[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** 편집권(STOMP 대신 가짜 서버가 관리). target은 TITLE·DATE·PHOTO:{번들 사진 ID} */
export type MockLease = {
  bundleId: number;
  target: string;
  memberId: number;
  token: string;
  leaseVersion: number;
  expiresAt: string;
};

export type MockDbState = {
  members: MockMember[];
  bunches: MockBunch[];
  memberships: MockMembership[];
  photos: MockPhoto[];
  bundles: MockBundle[];
  bundleLeases: MockLease[];
};

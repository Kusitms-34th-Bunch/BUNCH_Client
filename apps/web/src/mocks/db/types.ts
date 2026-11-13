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
  /** 가짜 DB 내부 표현, 번치 홈 응답에서 visibility(PUBLIC·PRIVATE)로 바뀜 */
  isPrivate: boolean;
  /** 번치 홈의 팔로워·팔로잉 수(관계 API가 없어 시작 데이터 값) */
  followerCount: number;
  followingCount: number;
  /** 프로필 버전(저장할 때마다 1 올라감, 번치 홈 응답의 profileVersion). 없으면 1 */
  profileVersion?: number;
  /** 멤버 구성 버전(역할 변경·내보내기·넘기기마다 1 올라감). 없으면 1 */
  membershipVersion?: number;
};

export type MockMembership = {
  bunchId: number;
  memberId: number;
  role: MemberRole;
  /** 이 번치를 마지막으로 쓴 시각(ISO). 가장 최근 번치가 기본 번치(`members/me`) */
  lastUsedAt: string;
};

/** 삭제됐거나 내보내진 번치의 안내(번치 전환 목록의 접근 불가 줄) */
export type MockBunchAccessNotice = {
  id: number;
  bunchId: number;
  name: string;
  characterType: CharacterType;
  reason: 'REMOVED' | 'DELETED';
  occurredAt: string;
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
  /** 업로드로 만든 사진의 파일 SHA-256(같은 번치에서 같은 파일을 합치는 판별용). 시작 데이터의 사진에는 없음 */
  contentHash?: string;
};

export type BundleVisibility = 'PUBLIC' | 'PRIVATE';

/** 번들에 저장된 장소(검색은 BFF가 하고 서버는 저장만 하는 방향의 모양: provider, externalId, name, address) */
export type MockLocation = {
  provider: string;
  externalId: string;
  name: string;
  address: string;
};

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
  locations: MockLocation[];
  locationsVersion: number;
  revision: number;
  photos: MockBundlePhoto[];
  participants: { memberId: number; joinedAt: string }[];
  comments: MockBundleComment[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** 편집권(STOMP 대신 가짜 서버가 관리). target은 TITLE·DATE·LOCATION·PHOTO:{번들 사진 ID} */
export type MockLease = {
  bundleId: number;
  target: string;
  memberId: number;
  token: string;
  leaseVersion: number;
  expiresAt: string;
};

/** 내 푸시 수신 설정: 계정 전체 수신과 알림 종류별 수신(서버 `NotificationType` 키 전체 맵) */
export type MockPushPreferences = { enabled: boolean; types: Record<string, boolean> };

/** 번치 사이 팔로우(follower가 target을 팔로우). 비공개 target은 승인 전까지 REQUESTED */
export type MockFollow = {
  id: number;
  followerBunchId: number;
  targetBunchId: number;
  status: 'REQUESTED' | 'FOLLOWING';
};

export type MockDbState = {
  members: MockMember[];
  bunches: MockBunch[];
  memberships: MockMembership[];
  photos: MockPhoto[];
  bundles: MockBundle[];
  bundleLeases: MockLease[];
  bunchAccessNotices: MockBunchAccessNotice[];
  pushPreferences: MockPushPreferences;
  follows: MockFollow[];
};

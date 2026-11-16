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
  /** 가짜 DB의 팔로우 관계 밖 팔로워·팔로잉 수(번치 홈의 수는 이 값에 승인된 관계를 더함) */
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
  /** 서버가 발급한 장소 행 id. 없으면(시드·옛 데이터) 목록 순서로 정함 */
  id?: number;
  provider: string;
  externalId: string;
  name: string;
  /** 주소 없음은 null */
  address: string | null;
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
  /** 참여자별 본인 픽 행(없으면 아직 한 번도 픽하지 않음). picked=false 행도 버전 비교를 위해 남김 */
  picks?: { memberId: number; picked: boolean; version: number }[];
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
  /** 제목 CRDT 문서(Automerge 전체 저장 문서 base64). 처음 쓸 때 제목으로 만듦 */
  titleCrdtState?: string;
  visibility: BundleVisibility | null;
  visibilityVersion: number;
  date: string | null;
  dateVersion: number;
  locations: MockLocation[];
  locationsVersion: number;
  /** 지금까지 발급한 장소 행 id의 최댓값(줄을 지워도 같은 id를 다시 주지 않으려고 따로 둠, 없으면 현재 목록에서 정함) */
  lastLocationId?: number;
  revision: number;
  photos: MockBundlePhoto[];
  participants: { memberId: number; joinedAt: string }[];
  comments: MockBundleComment[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** 내 푸시 수신 설정: 계정 전체 수신과 알림 종류별 수신(서버 `NotificationType` 키 전체 맵) */
export type MockPushPreferences = { enabled: boolean; categories: Record<string, boolean> };

/** 번치 사이 팔로우(follower가 target을 팔로우). 비공개 target은 승인 전까지 REQUESTED */
export type MockFollow = {
  id: number;
  followerBunchId: number;
  targetBunchId: number;
  status: 'REQUESTED' | 'FOLLOWING';
  /** 요청·팔로우 시각(ISO). 목록의 requestedAt·followedAt */
  createdAt: string;
};

/** 번치 사이 차단(blocker가 target을 차단) */
export type MockBlock = {
  id: number;
  blockerBunchId: number;
  targetBunchId: number;
  createdAt: string;
};

/** 번치 알림(내 회원 기준, 번치마다 쌓임). target은 Swagger `NotificationTarget` 모양 */
export type MockNotification = {
  id: number;
  bunchId: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  target: {
    kind: string;
    bunchId: number;
    bundleId?: number;
    targetBunchId?: number;
    /** 접근 불가 알림(`ACCESS_NOTICE`)의 안내 ID */
    noticeId?: number;
  };
};

/** 번치·번들·댓글 신고(접수만, 처리 결과는 화면에 없음). 번들·댓글이면 그 번들의 번치가 대상 번치 */
export type MockReport = {
  id: number;
  reporterBunchId: number;
  targetBunchId: number;
  bundleId?: number;
  commentId?: number;
  reason: 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'PERSONAL_INFORMATION' | 'OTHER';
  detail: string | null;
};

/** 번치의 콕한 장소(번치 명의, 같은 장소는 출처가 달라도 하나) */
export type MockKok = {
  id: number;
  bunchId: number;
  provider: string;
  externalId: string;
  name: string;
  address: string;
  /** 번들 장소에서 콕했으면 그 번들·위치, 광고에서 콕했으면 그 광고 */
  sourceBundleId: number | null;
  sourceLocationId: number | null;
  sourceAdvertisementId: number | null;
  pinnedByMemberId: number;
  pinnedAt: string;
};

/** 번치 공동 좋아요(번치 명의, 같은 번치 멤버가 함께 씀) */
export type MockLike = { bunchId: number; bundleId: number };

/** 발행 번들의 소셜 댓글·답글(참여 멤버 코멘트 `MockBundleComment`와 별개, 명세 014~017) */
export type MockSocialComment = {
  id: number;
  bundleId: number;
  /** 답글이면 원댓글 ID(한 단계만) */
  parentId: number | null;
  memberId: number;
  /** 작성 당시 번치(배지) */
  bunchId: number;
  content: string;
  createdAt: string;
  deleted: boolean;
};

/** 이 브라우저의 로그인·가입 상태(`GET /members/me/onboarding`의 근거) */
export type MockSession = {
  loggedIn: boolean;
  signupStatus: 'IN_PROGRESS' | 'COMPLETED';
  termsAccepted: boolean;
};

export type MockDbState = {
  session: MockSession;
  members: MockMember[];
  bunches: MockBunch[];
  memberships: MockMembership[];
  photos: MockPhoto[];
  bundles: MockBundle[];
  bunchAccessNotices: MockBunchAccessNotice[];
  pushPreferences: MockPushPreferences;
  follows: MockFollow[];
  blocks: MockBlock[];
  reports: MockReport[];
  likes: MockLike[];
  koks: MockKok[];
  /** 내가 숨긴 광고(사용자 단위) */
  hiddenAdIds: number[];
  /** 마지막에 준 콕 ID(지운 콕의 ID를 새 콕에 다시 주지 않게) */
  lastKokId: number;
  socialComments: MockSocialComment[];
  notifications: MockNotification[];
};

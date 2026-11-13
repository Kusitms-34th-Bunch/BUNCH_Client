import type {
  CharacterType,
  MockBundle,
  MockDbState,
  MockFollow,
  MockMember,
  MockMembership,
  MockPhoto,
} from './types';

/** 서버 `NotificationType` 21개 키(Notion 푸시 수신 설정 조회 응답 순서). 푸시 수신 설정 `types`의 키 전체 */
export const PUSH_NOTIFICATION_TYPES = [
  'DRAFT_PARTICIPANT_ADDED',
  'DRAFT_ACTIVITY',
  'COMMENT_REMINDER',
  'DRAFT_PARTICIPANT_REMOVED',
  'DRAFT_READY_TO_PUBLISH',
  'DRAFT_PARTICIPANTS_INSUFFICIENT',
  'BUNDLE_PUBLISHED',
  'CANDIDATE_CREATED',
  'CHARACTER_GROWN',
  'MEMBER_JOINED',
  'CO_OWNER_GRANTED',
  'CO_OWNER_REVOKED',
  'OWNER_TRANSFERRED',
  'MEMBER_REMOVED',
  'BUNCH_DELETED',
  'BUNCH_VISIBILITY_CHANGED',
  'BUNCH_FOLLOWED',
  'FOLLOW_REQUESTED',
  'FOLLOW_REQUEST_APPROVED',
  'SOCIAL_COMMENT_CREATED',
  'BUNDLE_LIKED',
] as const;

export const MOCK_BUNCH_ID = 1;

/** UT 시나리오의 등장 인물: 관리자, 멤버 A·B·C, 시연하는 사람(일반 멤버, 번들 초안 생성자) */
export const MOCK_MEMBER_IDS = { admin: 1, memberA: 2, memberB: 3, memberC: 4, me: 5 } as const;

/** 로그인 없이 이 회원으로 접속한 것으로 간주 */
export const MOCK_MY_MEMBER_ID = MOCK_MEMBER_IDS.me;

const { admin, memberA, memberB, memberC, me } = MOCK_MEMBER_IDS;

const member = (memberId: number, nickname: string): MockMember => ({
  memberId,
  nickname,
  imageUrl: null,
  birthYear: null,
  gender: null,
});

// 시연 번치(여행쥬아)가 가장 최근에 쓴 번치라 기본 번치가 됨
const membership = (
  memberId: number,
  role: MockMembership['role'],
  bunchId = MOCK_BUNCH_ID,
  lastUsedAt = '2026-10-18T09:00:00.000Z',
): MockMembership => ({ bunchId, memberId, role, lastUsedAt });

/** 번치 전환 시연용 두 번째 번치(Figma 5402:105276 「퇴근런클럽」) */
export const MOCK_SECOND_BUNCH_ID = 2;
/** 내가 속하지 않은 번치(다른 번치 프로필·팔로우): 공개 「캠핑러버」, 비공개 「책방산책」 */
export const MOCK_EXTERNAL_BUNCH_IDS = { public: 3, private: 4 } as const;

// 팔로워·팔로잉·요청 목록용 다른 번치(화면설계서 2500:71333·2500:72664 예시 이름, 소속 없음)
const SOCIAL_BUNCHES: readonly [
  id: number,
  name: string,
  type: CharacterType,
  isPrivate: boolean,
][] = [
  [5, '산책클럽', 'TYPE_1', true],
  [6, '주말등산', 'TYPE_3', false],
  [7, '서핑크루', 'TYPE_2', true],
  [8, '맛집탐방대', 'TYPE_4', false],
  [9, '침대조아', 'TYPE_1', true],
  // 여행쥬아가 차단한 번치(Figma 1873:33766 차단 목록 예시 이름)
  [10, '야간러너스', 'TYPE_2', false],
  [11, '주말산책', 'TYPE_4', true],
];

// [팔로우하는 번치, 대상 번치, 상태, 시각]. 여행쥬아(1)는 팔로워 3·팔로잉 2·대기 요청 3
const FOLLOW_SEEDS: readonly [number, number, MockFollow['status'], string][] = [
  [5, 1, 'FOLLOWING', '2026-10-10T09:00:00.000Z'],
  [3, 1, 'FOLLOWING', '2026-10-12T09:00:00.000Z'],
  [6, 1, 'FOLLOWING', '2026-10-14T09:00:00.000Z'],
  [1, 5, 'FOLLOWING', '2026-10-11T09:00:00.000Z'],
  [1, 6, 'FOLLOWING', '2026-10-13T09:00:00.000Z'],
  [7, 1, 'REQUESTED', '2026-10-17T09:00:00.000Z'],
  [8, 1, 'REQUESTED', '2026-10-17T10:00:00.000Z'],
  [9, 1, 'REQUESTED', '2026-10-15T09:00:00.000Z'],
  [5, 3, 'FOLLOWING', '2026-10-09T09:00:00.000Z'],
  [6, 3, 'FOLLOWING', '2026-10-08T09:00:00.000Z'],
  [5, 4, 'FOLLOWING', '2026-10-07T09:00:00.000Z'],
];

// 날짜 그룹: S는 10월 18일, P는 10월 17일(지정 날짜 4장), O는 10월 3일
const PHOTO_SEEDS = [
  { label: 'S1', date: '2026-10-18', time: '09:10:00', uploaderIds: [admin] },
  { label: 'S2', date: '2026-10-18', time: '09:40:00', uploaderIds: [memberA] },
  { label: 'S3', date: '2026-10-18', time: '11:05:00', uploaderIds: [memberB] },
  { label: 'S4', date: '2026-10-18', time: '13:20:00', uploaderIds: [me] },
  { label: 'S5', date: '2026-10-18', time: '15:45:00', uploaderIds: [memberA] },
  { label: 'S6', date: '2026-10-18', time: '18:30:00', uploaderIds: [memberC] },
  { label: 'P1', date: '2026-10-17', time: '07:05:00', uploaderIds: [memberA] },
  { label: 'P2', date: '2026-10-17', time: '12:30:00', uploaderIds: [memberB] },
  { label: 'P3', date: '2026-10-17', time: '15:10:00', uploaderIds: [me] },
  { label: 'P4', date: '2026-10-17', time: '17:40:00', uploaderIds: [memberB] },
  { label: 'O1', date: '2026-10-03', time: '10:00:00', uploaderIds: [admin] },
  { label: 'O2', date: '2026-10-03', time: '12:00:00', uploaderIds: [memberC] },
  { label: 'O3', date: '2026-10-03', time: '16:30:00', uploaderIds: [memberA] },
] as const;

type PhotoLabel = (typeof PHOTO_SEEDS)[number]['label'];

/** 시나리오의 사진 이름(S1~O3)별 사진 ID, 순서대로 1부터 */
export const MOCK_PHOTO_IDS = Object.fromEntries(
  PHOTO_SEEDS.map((photo, index) => [photo.label, index + 1]),
) as Record<PhotoLabel, number>;

// 시연용 사진(얼굴이 나오지 않는 사진, EXIF 제거)은 public/mock/photos에 둠. 썸네일 543x724, 원본 1086x1448
const PHOTO_DIR = '/mock/photos';

// 번치 홈의 기존 발행 번들(UT 시나리오 더미 데이터 C1·C2): 대표 사진 1장, 참여 멤버 전원 코멘트 작성 완료
const PUBLISHED_SEEDS = [
  {
    id: 1,
    title: '강릉 커피 투어 ☕',
    date: '2026-09-20',
    image: 'C1',
    createdBy: admin,
    participants: [admin, memberA, me],
    publishedAt: '2026-09-21T09:00:00.000Z',
  },
  {
    id: 2,
    title: '망원 한강 피크닉 🧺',
    date: '2026-08-29',
    image: 'C2',
    createdBy: memberB,
    participants: [memberB, memberC, me],
    publishedAt: '2026-08-30T09:00:00.000Z',
  },
] as const;

type PublishedSeed = {
  readonly id: number;
  readonly title: string;
  readonly date: string;
  readonly image: string;
  readonly createdBy: number;
  readonly participants: readonly number[];
  readonly publishedAt: string;
};

// 다른 번치의 발행 번들(멤버는 가짜 DB에 없어 시연 회원 ID를 빌려 씀, 다른 번치 프로필 그리드용)
const EXTERNAL_PUBLISHED_SEEDS: Readonly<Record<number, readonly PublishedSeed[]>> = {
  [MOCK_EXTERNAL_BUNCH_IDS.public]: [
    {
      id: 901,
      title: '가평 첫 캠핑 🏕️',
      date: '2026-10-11',
      image: 'C1',
      createdBy: admin,
      participants: [admin],
      publishedAt: '2026-10-12T09:00:00.000Z',
    },
    {
      id: 902,
      title: '여름밤 바닷가 캠핑',
      date: '2026-08-15',
      image: 'C2',
      createdBy: admin,
      participants: [admin],
      publishedAt: '2026-08-16T09:00:00.000Z',
    },
  ],
  [MOCK_EXTERNAL_BUNCH_IDS.private]: [
    {
      id: 911,
      title: '노을 지는 동네 책방 투어',
      date: '2026-10-05',
      image: 'C2',
      createdBy: admin,
      participants: [admin],
      publishedAt: '2026-10-06T09:00:00.000Z',
    },
  ],
};

const publishedBundles = (
  seeds: readonly PublishedSeed[] = PUBLISHED_SEEDS,
  bunchId: number = MOCK_BUNCH_ID,
  visibility: MockBundle['visibility'] = 'PRIVATE',
): MockBundle[] =>
  seeds.map((seed) => {
    const at = seed.publishedAt;
    return {
      id: seed.id,
      bunchId,
      createdBy: seed.createdBy,
      status: 'PUBLISHED',
      title: seed.title,
      titleVersion: 1,
      visibility,
      visibilityVersion: 1,
      date: seed.date,
      dateVersion: 1,
      locations: [],
      locationsVersion: 0,
      revision: 10,
      photos: [
        {
          id: seed.id,
          photoId: null,
          imageAssetId: 9000 + seed.id,
          imageUrl: `${PHOTO_DIR}/${seed.image}.jpg`,
          position: 0,
          addedBy: seed.createdBy,
          addedAt: at,
        },
      ],
      participants: seed.participants.map((memberId) => ({ memberId, joinedAt: at })),
      comments: seed.participants.map((memberId) => ({
        memberId,
        content: '함께해서 즐거웠어요!',
        version: 1,
        createdAt: at,
        updatedAt: at,
      })),
      createdAt: at,
      updatedAt: at,
      publishedAt: at,
    };
  });

const photos = (): MockPhoto[] =>
  PHOTO_SEEDS.map((photo, index) => ({
    photoId: index + 1,
    bunchId: MOCK_BUNCH_ID,
    uploaderIds: [...photo.uploaderIds],
    capturedDate: photo.date,
    capturedTime: photo.time,
    thumbnailUrl: `${PHOTO_DIR}/${photo.label}-thumb.jpg`,
    imageUrl: `${PHOTO_DIR}/${photo.label}.jpg`,
  }));

// UT 시나리오 시작 데이터(상태 A): 비공개 번치 「여행쥬아」와 멤버 5명, 사진 13장
export const createSeed = (): MockDbState => ({
  members: [
    member(admin, '지예'),
    member(memberA, '경진'),
    member(memberB, '은우'),
    member(memberC, '수인'),
    member(me, '큐시즘'),
    // 다른 번치 멤버(명단 화면용, 내 번치와 겹치지 않는 회원)
    ...(['솔', '하람', '도윤', '서아'] as const).map((name, index) => member(101 + index, name)),
    ...(['지안', '루아', '하윤', '서진', '다온', '이든'] as const).map((name, index) =>
      member(201 + index, name),
    ),
  ],
  bunches: [
    {
      id: MOCK_BUNCH_ID,
      name: '여행쥬아',
      characterType: 'TYPE_1',
      imageUrl: null,
      introduction: '여행 안 갈 바엔 죽을란다',
      isPrivate: true,
      // 수는 모두 가짜 DB의 팔로우 관계(FOLLOW_SEEDS)
      followerCount: 0,
      followingCount: 0,
    },
    {
      id: MOCK_SECOND_BUNCH_ID,
      name: '퇴근런클럽',
      characterType: 'TYPE_2',
      imageUrl: null,
      introduction: '퇴근하고 한강 달리는 모임',
      isPrivate: false,
      followerCount: 0,
      followingCount: 0,
    },
    // 다른 번치(피드 샘플의 캠핑러버·책방산책과 같은 ID)
    {
      id: MOCK_EXTERNAL_BUNCH_IDS.public,
      name: '캠핑러버',
      characterType: 'TYPE_2',
      imageUrl: null,
      introduction: '주말마다 캠핑장을 찾아다니는 넷',
      isPrivate: false,
      // 관계 밖 수 + FOLLOW_SEEDS(팔로워 2·팔로잉 1) = 23·8
      followerCount: 21,
      followingCount: 7,
    },
    {
      id: MOCK_EXTERNAL_BUNCH_IDS.private,
      name: '책방산책',
      characterType: 'TYPE_4',
      imageUrl: null,
      introduction: '책과 커피를 기록하는 모임',
      isPrivate: true,
      // 관계 밖 수 + FOLLOW_SEEDS(팔로워 1) = 32·12
      followerCount: 31,
      followingCount: 12,
    },
    ...SOCIAL_BUNCHES.map(([id, name, characterType, isPrivate]) => ({
      id,
      name,
      characterType,
      imageUrl: null,
      introduction: '',
      isPrivate,
      followerCount: 0,
      followingCount: 0,
    })),
  ],
  memberships: [
    membership(admin, 'OWNER'),
    membership(memberA, 'MEMBER'),
    membership(memberB, 'MEMBER'),
    membership(memberC, 'MEMBER'),
    membership(me, 'MEMBER'),
    membership(admin, 'OWNER', MOCK_SECOND_BUNCH_ID, '2026-10-01T09:00:00.000Z'),
    membership(me, 'MEMBER', MOCK_SECOND_BUNCH_ID, '2026-10-01T09:00:00.000Z'),
    // 다른 번치의 멤버(내 소속은 없음)
    ...[101, 102, 103, 104].map((id, index) =>
      membership(id, index === 0 ? 'OWNER' : 'MEMBER', MOCK_EXTERNAL_BUNCH_IDS.public),
    ),
    ...[201, 202, 203, 204, 205, 206].map((id, index) =>
      membership(id, index === 0 ? 'OWNER' : 'MEMBER', MOCK_EXTERNAL_BUNCH_IDS.private),
    ),
  ],
  photos: photos(),
  // UT 시작 데이터(상태 A): 초안은 없고 번치 홈에는 기존 발행 번들 2개가 있음
  bundles: [
    ...publishedBundles(),
    ...publishedBundles(
      EXTERNAL_PUBLISHED_SEEDS[MOCK_EXTERNAL_BUNCH_IDS.public],
      MOCK_EXTERNAL_BUNCH_IDS.public,
      'PUBLIC',
    ),
    ...publishedBundles(
      EXTERNAL_PUBLISHED_SEEDS[MOCK_EXTERNAL_BUNCH_IDS.private],
      MOCK_EXTERNAL_BUNCH_IDS.private,
      'PUBLIC',
    ),
  ],
  blocks: [
    {
      id: 1,
      blockerBunchId: MOCK_BUNCH_ID,
      targetBunchId: 11,
      createdAt: '2026-10-05T09:00:00.000Z',
    },
    {
      id: 2,
      blockerBunchId: MOCK_BUNCH_ID,
      targetBunchId: 10,
      createdAt: '2026-10-08T09:00:00.000Z',
    },
  ],
  reports: [],
  // 여행쥬아: 읽지 않은 3개(최신순 앞), 읽은 1개. 마지막 번들(9999)은 지워져 열 수 없는 알림. 퇴근런클럽: 읽지 않은 1개
  notifications: [
    {
      id: 1,
      bunchId: MOCK_BUNCH_ID,
      type: 'CANDIDATE_CREATED',
      title: '새로운 번들 후보가 생겼어요',
      body: '함께한 순간을 번들로 만들어 보세요.',
      createdAt: '2026-11-13T09:00:00.000Z',
      readAt: null,
      target: { kind: 'CANDIDATES', bunchId: MOCK_BUNCH_ID },
    },
    {
      id: 2,
      bunchId: MOCK_BUNCH_ID,
      type: 'BUNDLE_PUBLISHED',
      title: '새 번들이 올라왔어요',
      body: '번들을 확인해 보세요.',
      createdAt: '2026-11-12T09:00:00.000Z',
      readAt: null,
      target: { kind: 'BUNDLE', bunchId: MOCK_BUNCH_ID, bundleId: 1 },
    },
    {
      id: 3,
      bunchId: MOCK_BUNCH_ID,
      type: 'BUNCH_FOLLOWED',
      title: '캠핑러버 번치가 팔로우했어요',
      body: '번치 프로필을 확인해 보세요.',
      createdAt: '2026-11-11T09:00:00.000Z',
      readAt: null,
      target: {
        kind: 'OTHER_BUNCH_PROFILE',
        bunchId: MOCK_BUNCH_ID,
        targetBunchId: MOCK_EXTERNAL_BUNCH_IDS.public,
      },
    },
    {
      id: 4,
      bunchId: MOCK_BUNCH_ID,
      type: 'BUNDLE_LIKED',
      title: '번들에 좋아요가 달렸어요',
      body: '지금은 볼 수 없는 번들이에요.',
      createdAt: '2026-11-01T09:00:00.000Z',
      readAt: '2026-11-02T09:00:00.000Z',
      target: { kind: 'BUNDLE', bunchId: MOCK_BUNCH_ID, bundleId: 9999 },
    },
    {
      id: 5,
      bunchId: MOCK_SECOND_BUNCH_ID,
      type: 'MEMBER_JOINED',
      title: '새 멤버가 들어왔어요',
      body: '멤버를 확인해 보세요.',
      createdAt: '2026-11-10T09:00:00.000Z',
      readAt: null,
      target: { kind: 'MEMBERS', bunchId: MOCK_SECOND_BUNCH_ID },
    },
  ],
  follows: FOLLOW_SEEDS.map(([followerBunchId, targetBunchId, status, createdAt], index) => ({
    id: index + 1,
    followerBunchId,
    targetBunchId,
    status,
    createdAt,
  })),
  // 번치 전환 목록의 접근 불가 줄(Figma 5402:105276 안내 창의 번치들)
  bunchAccessNotices: [
    {
      id: 1,
      bunchId: 90,
      name: '홍대역',
      characterType: 'TYPE_3',
      reason: 'DELETED',
      occurredAt: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 2,
      bunchId: 91,
      name: '큐시즘 맛집',
      characterType: 'TYPE_4',
      reason: 'REMOVED',
      occurredAt: '2026-10-16T09:00:00.000Z',
    },
  ],
  // 저장값이 없으면 전체와 모든 알림 종류가 켜짐(Notion 푸시 수신 설정 조회)
  pushPreferences: {
    enabled: true,
    categories: Object.fromEntries(PUSH_NOTIFICATION_TYPES.map((type) => [type, true])),
  },
});

import type { MockBundle, MockDbState, MockMember, MockMembership, MockPhoto } from './types';

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

const publishedBundles = (): MockBundle[] =>
  PUBLISHED_SEEDS.map((seed) => {
    const at = seed.publishedAt;
    return {
      id: seed.id,
      bunchId: MOCK_BUNCH_ID,
      createdBy: seed.createdBy,
      status: 'PUBLISHED',
      title: seed.title,
      titleVersion: 1,
      visibility: 'PRIVATE',
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
          caption: '',
          captionVersion: 0,
          captionUpdatedBy: null,
          captionUpdatedAt: null,
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
  ],
  bunches: [
    {
      id: MOCK_BUNCH_ID,
      name: '여행쥬아',
      characterType: 'TYPE_1',
      imageUrl: null,
      introduction: '여행 안 갈 바엔 죽을란다',
      isPrivate: true,
      // UT 시나리오에 값이 없어 임의로 정한 시작 값
      followerCount: 3,
      followingCount: 2,
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
  ],
  memberships: [
    membership(admin, 'OWNER'),
    membership(memberA, 'MEMBER'),
    membership(memberB, 'MEMBER'),
    membership(memberC, 'MEMBER'),
    membership(me, 'MEMBER'),
    membership(admin, 'OWNER', MOCK_SECOND_BUNCH_ID, '2026-10-01T09:00:00.000Z'),
    membership(me, 'MEMBER', MOCK_SECOND_BUNCH_ID, '2026-10-01T09:00:00.000Z'),
  ],
  photos: photos(),
  // UT 시작 데이터(상태 A): 초안은 없고 번치 홈에는 기존 발행 번들 2개가 있음
  bundles: publishedBundles(),
  bundleLeases: [],
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
});

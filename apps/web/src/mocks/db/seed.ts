import type { MockDbState, MockMember, MockMembership, MockPhoto } from './types';
import { placeholderImage } from './placeholderImage';

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

const membership = (memberId: number, role: MockMembership['role']): MockMembership => ({
  bunchId: MOCK_BUNCH_ID,
  memberId,
  role,
});

// 날짜 그룹: S는 10월 18일, P는 10월 17일(지정 날짜 4장), O는 10월 3일
const PHOTO_SEEDS = [
  { label: 'S1', date: '2026-10-18', time: '09:10:00', uploaderIds: [admin], hue: 200 },
  { label: 'S2', date: '2026-10-18', time: '09:40:00', uploaderIds: [memberA], hue: 210 },
  { label: 'S3', date: '2026-10-18', time: '11:05:00', uploaderIds: [memberB], hue: 220 },
  { label: 'S4', date: '2026-10-18', time: '13:20:00', uploaderIds: [me], hue: 230 },
  { label: 'S5', date: '2026-10-18', time: '15:45:00', uploaderIds: [memberA], hue: 240 },
  { label: 'S6', date: '2026-10-18', time: '18:30:00', uploaderIds: [memberC], hue: 250 },
  { label: 'P1', date: '2026-10-17', time: '07:05:00', uploaderIds: [memberA], hue: 30 },
  { label: 'P2', date: '2026-10-17', time: '12:30:00', uploaderIds: [memberB], hue: 45 },
  { label: 'P3', date: '2026-10-17', time: '15:10:00', uploaderIds: [me], hue: 60 },
  { label: 'P4', date: '2026-10-17', time: '17:40:00', uploaderIds: [memberB], hue: 15 },
  { label: 'O1', date: '2026-10-03', time: '10:00:00', uploaderIds: [admin], hue: 150 },
  { label: 'O2', date: '2026-10-03', time: '12:00:00', uploaderIds: [memberC], hue: 160 },
  { label: 'O3', date: '2026-10-03', time: '16:30:00', uploaderIds: [memberA], hue: 170 },
] as const;

type PhotoLabel = (typeof PHOTO_SEEDS)[number]['label'];

/** 시나리오의 사진 이름(S1~O3)별 사진 ID, 순서대로 1부터 */
export const MOCK_PHOTO_IDS = Object.fromEntries(
  PHOTO_SEEDS.map((photo, index) => [photo.label, index + 1]),
) as Record<PhotoLabel, number>;

const photos = (): MockPhoto[] =>
  PHOTO_SEEDS.map((photo, index) => ({
    photoId: index + 1,
    bunchId: MOCK_BUNCH_ID,
    uploaderIds: [...photo.uploaderIds],
    capturedDate: photo.date,
    capturedTime: photo.time,
    thumbnailUrl: placeholderImage(photo.label, photo.hue, 300),
    imageUrl: placeholderImage(photo.label, photo.hue, 1024),
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
    },
  ],
  memberships: [
    membership(admin, 'OWNER'),
    membership(memberA, 'MEMBER'),
    membership(memberB, 'MEMBER'),
    membership(memberC, 'MEMBER'),
    membership(me, 'MEMBER'),
  ],
  photos: photos(),
});

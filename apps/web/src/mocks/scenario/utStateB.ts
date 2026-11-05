import type { MockBundle, MockLease } from '../db/types';
import { MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '../db/seed';

// UT 상태 B: 참여자가 P1~P4로 번들을 만든 직후, 다른 멤버가 이미 쓰고 있던 초안으로 덧입힘
// UT가 끝나면 이 폴더와 `draftCreated.ts`의 호출만 지우면 됨, 값은 UT 시나리오 기준(임의로 정한 문구는 `ponytail:`)
const { memberA, memberB } = MOCK_MEMBER_IDS;
const STATE_B_LABELS = ['P1', 'P2', 'P3', 'P4'] as const;

// 편집권을 놓지 않는 멤버를 흉내 내기 위한 만료 시각(heartbeat·해제는 본인 토큰만 가능해 참여자가 건드릴 수 없음)
const NEVER_EXPIRES_AT = '2999-12-31T00:00:00.000Z';

// ponytail: 제목·캡션 문구는 시나리오 원문이 없어 임의로 정함
const TITLE = '속초 첫째 날 🌊';
const DATE = '2026-10-17';
const CAPTIONS = { P1: '도착하자마자 바다부터!', P2: '여기서 한참 놀았어요' } as const;
// ponytail: 위치는 속초해수욕장 한 곳, 주소는 임의 값
const LOCATION = {
  provider: 'KAKAO',
  externalId: 'mock-sokcho-beach',
  name: '속초해수욕장',
  address: '강원 속초시 조양동',
} as const;
const COMMENTS = [
  { memberId: memberA, content: '속초 바다 너무 좋았어요!' },
  { memberId: memberB, content: '다음에 또 가요 :)' },
] as const;

const stateBPhotoIds = STATE_B_LABELS.map((label) => MOCK_PHOTO_IDS[label]);

/** 고른 사진이 P1~P4 정확히 네 장인지 */
export const isStateBSelection = (photoIds: readonly number[]) =>
  photoIds.length === stateBPhotoIds.length && stateBPhotoIds.every((id) => photoIds.includes(id));

type Applied = { bundle: MockBundle; leases: MockLease[] };

/**
 * 만들어진 초안에 상태 B를 덧입힘, 사진 ID로 맞추고 참여 멤버·사진 순서는 서버 규칙 그대로 둠
 * 제목·P1 캡션·날짜·멤버 A·B 코멘트가 채워지고, P2 캡션은 멤버 A가 편집 중으로 고정됨
 */
export const applyUtStateB = (bundle: MockBundle): Applied => {
  const sourceIds = bundle.photos.map((photo) => photo.photoId);
  if (!isStateBSelection(sourceIds.filter((id): id is number => id !== null))) {
    return { bundle, leases: [] };
  }
  const at = bundle.createdAt;
  const photoOf = (label: 'P1' | 'P2') =>
    bundle.photos.find((photo) => photo.photoId === MOCK_PHOTO_IDS[label]);
  const first = photoOf('P1');
  const second = photoOf('P2');

  const next: MockBundle = {
    ...bundle,
    title: TITLE,
    titleVersion: 1,
    date: DATE,
    dateVersion: 1,
    locations: [LOCATION],
    locationsVersion: 1,
    photos: bundle.photos.map((photo) =>
      photo.id === first?.id
        ? {
            ...photo,
            caption: CAPTIONS.P1,
            captionVersion: 1,
            captionUpdatedBy: memberA,
            captionUpdatedAt: at,
          }
        : photo,
    ),
    // 참여 멤버가 아닌 쪽의 코멘트는 만들지 않음(서버 규칙: 참여자만 코멘트 row를 가짐)
    comments: [
      ...bundle.comments,
      ...COMMENTS.filter((comment) =>
        bundle.participants.some((participant) => participant.memberId === comment.memberId),
      ).map((comment) => ({ ...comment, version: 1, createdAt: at, updatedAt: at })),
    ],
    revision: bundle.revision + 5,
  };

  const fixedLease = (target: string, memberId: number, token: string): MockLease => ({
    bundleId: bundle.id,
    target,
    memberId,
    token,
    leaseVersion: 1,
    expiresAt: NEVER_EXPIRES_AT,
  });
  const leases: MockLease[] = [
    ...(second
      ? [fixedLease(`PHOTO:${second.id}`, memberA, '00000000-0000-4000-8000-00000000000a')]
      : []),
    fixedLease('LOCATION', memberB, '00000000-0000-4000-8000-00000000000b'),
  ];
  return { bundle: next, leases };
};

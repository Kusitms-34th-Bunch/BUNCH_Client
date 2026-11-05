import type { MockBundle, MockBundlePhoto, MockDbState, MockLease } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '../db/seed';

// UT 상태 B: 참여자가 P1~P4로 번들을 만든 직후, 다른 멤버가 이미 쓰고 있던 초안으로 덧입힘
// UT가 끝나면 이 폴더와 `draftCreated.ts`의 호출만 지우면 됨, 값은 UT 시나리오 「번들 초안 텍스트(상태 B)」 기준
const { memberA, memberB } = MOCK_MEMBER_IDS;
const STATE_B_LABELS = ['P1', 'P2', 'P3', 'P4'] as const;

// 편집권을 놓지 않는 멤버를 흉내 내기 위한 만료 시각(heartbeat·해제는 본인 토큰만 가능해 참여자가 건드릴 수 없음)
const NEVER_EXPIRES_AT = '2999-12-31T00:00:00.000Z';

const TITLE = '속초 첫째 날 🌊';
const DATE = '2026-10-17';
// P1은 작성 완료, P2는 멤버 A(경진)가 쓰던 중인 문장
const CAPTIONS = {
  P1: '아침 7시 영금정! 바람은 미쳤는데 바다 색이 진짜 예술이었다',
  P2: '닭강정 줄 30분 섰는데',
} as const;
// ponytail: 위치 주소는 시나리오에 없어 임의 값
const LOCATION = {
  provider: 'KAKAO',
  externalId: 'mock-sokcho-beach',
  name: '속초해수욕장',
  address: '강원 속초시 조양동',
} as const;
const COMMENTS = [
  {
    memberId: memberA,
    content: '닭강정 또 먹고 싶다… 다음엔 무조건 2박 3일로 가자! 사진 정리해줘서 고마워 🙌',
  },
  {
    memberId: memberB,
    content: '갯배 탈 때 다들 소리 지른 거 아직도 웃김ㅋㅋㅋ 바다 보면서 멍때린 시간이 제일 좋았어',
  },
] as const;

const stateBPhotoIds = STATE_B_LABELS.map((label) => MOCK_PHOTO_IDS[label]);

/** 고른 사진이 P1~P4 정확히 네 장인지 */
export const isStateBSelection = (photoIds: readonly number[]) =>
  photoIds.length === stateBPhotoIds.length && stateBPhotoIds.every((id) => photoIds.includes(id));

const fixedLease = (
  bundle: MockBundle,
  target: string,
  memberId: number,
  token: string,
): MockLease => ({
  bundleId: bundle.id,
  target,
  memberId,
  token,
  leaseVersion: 1,
  expiresAt: NEVER_EXPIRES_AT,
});

// 상태 B의 고정 편집권: P2 캡션(멤버 A)과 위치(멤버 B)
const stateBLeases = (bundle: MockBundle): MockLease[] => {
  const second = bundle.photos.find((photo) => photo.photoId === MOCK_PHOTO_IDS.P2);
  return [
    ...(second
      ? [fixedLease(bundle, `PHOTO:${second.id}`, memberA, '00000000-0000-4000-8000-00000000000a')]
      : []),
    fixedLease(bundle, 'LOCATION', memberB, '00000000-0000-4000-8000-00000000000b'),
  ];
};

type Applied = { bundle: MockBundle; leases: MockLease[] };

/**
 * 만들어진 초안에 상태 B를 덧입힘, 사진 ID로 맞추고 참여 멤버·사진 순서는 서버 규칙 그대로 둠
 * 제목·P1·P2 캡션·날짜·위치·멤버 A·B 코멘트가 채워지고, P2 캡션은 멤버 A, 위치는 멤버 B가 편집 중으로 고정됨
 */
export const applyUtStateB = (bundle: MockBundle): Applied => {
  const sourceIds = bundle.photos.map((photo) => photo.photoId);
  if (!isStateBSelection(sourceIds.filter((id): id is number => id !== null))) {
    return { bundle, leases: [] };
  }
  const at = bundle.createdAt;
  const withCaption = (photo: MockBundlePhoto): MockBundlePhoto => {
    const caption =
      photo.photoId === MOCK_PHOTO_IDS.P1
        ? CAPTIONS.P1
        : photo.photoId === MOCK_PHOTO_IDS.P2
          ? CAPTIONS.P2
          : undefined;
    return caption === undefined
      ? photo
      : {
          ...photo,
          caption,
          captionVersion: 1,
          captionUpdatedBy: memberA,
          captionUpdatedAt: at,
        };
  };

  const next: MockBundle = {
    ...bundle,
    title: TITLE,
    titleVersion: 1,
    date: DATE,
    dateVersion: 1,
    locations: [LOCATION],
    locationsVersion: 1,
    photos: bundle.photos.map(withCaption),
    // 참여 멤버가 아닌 쪽의 코멘트는 만들지 않음(서버 규칙: 참여자만 코멘트 row를 가짐)
    comments: [
      ...bundle.comments,
      ...COMMENTS.filter((comment) =>
        bundle.participants.some((participant) => participant.memberId === comment.memberId),
      ).map((comment) => ({ ...comment, version: 1, createdAt: at, updatedAt: at })),
    ],
    revision: bundle.revision + 6,
  };
  return { bundle: next, leases: stateBLeases(next) };
};

// 되돌릴 때 버전은 앞서 화면이 알고 있던 값보다 커야 해서 올려 줌(어긋나면 화면이 충돌로 보고 최신 값을 다시 받음)
const bump = (version: number) => version + 1;

/**
 * 진행 중이던 초안을 상태 B로 되돌림(참여자가 경진·은우를 내보내거나 사진·제목을 바꿔 세팅이 깨졌을 때)
 * 같은 초안(ID 유지)에서 참여 멤버(큐시즘·경진·은우)·사진 P1~P4·제목·캡션·위치·날짜·코멘트·편집권을 상태 B로 맞추고,
 * 참여자가 쓴 코멘트와 고른 공개 범위는 지움, 초안이 없거나 이미 발행됐으면 그대로 둠
 */
export const restoreUtStateB = (state: MockDbState, bundleId: number): MockDbState => {
  const current = state.bundles.find((bundle) => bundle.id === bundleId);
  if (!current || current.status !== 'DRAFT') return state;
  const at = new Date().toISOString();

  // 사진: 지금 담긴 P1~P4는 순서를 지키고, 빠진 것은 뒤에 다시 담음, P1~P4가 아닌 사진은 뺌
  const kept = current.photos.filter(
    (photo) => photo.photoId !== null && stateBPhotoIds.includes(photo.photoId),
  );
  let nextPhotoId = Math.max(0, ...state.bundles.flatMap((b) => b.photos.map((p) => p.id)));
  const restored: MockBundlePhoto[] = stateBPhotoIds.flatMap((photoId) => {
    if (kept.some((photo) => photo.photoId === photoId)) return [];
    const source = state.photos.find(
      (photo) => photo.photoId === photoId && photo.bunchId === current.bunchId,
    );
    return source
      ? [
          {
            id: (nextPhotoId += 1),
            photoId,
            imageAssetId: photoId + 7000,
            imageUrl: source.imageUrl,
            position: 0,
            addedBy: MOCK_MY_MEMBER_ID,
            addedAt: at,
            caption: '',
            captionVersion: 0,
            captionUpdatedBy: null,
            captionUpdatedAt: null,
          },
        ]
      : [];
  });
  const emptyCaption = (photo: MockBundlePhoto): MockBundlePhoto => ({
    ...photo,
    caption: '',
    captionVersion: bump(photo.captionVersion),
    captionUpdatedBy: null,
    captionUpdatedAt: null,
  });
  const photos = [...kept, ...restored].map((photo, position) => ({
    ...emptyCaption(photo),
    position,
  }));

  // 참여 멤버: 큐시즘(생성자)·경진·은우, 원래 참여 시각이 있으면 그대로
  const participants = [MOCK_MY_MEMBER_ID, memberA, memberB].map((memberId) => ({
    memberId,
    joinedAt: current.participants.find((p) => p.memberId === memberId)?.joinedAt ?? at,
  }));

  const base: MockBundle = {
    ...current,
    title: TITLE,
    titleVersion: bump(current.titleVersion),
    visibility: null,
    visibilityVersion: bump(current.visibilityVersion),
    date: DATE,
    dateVersion: bump(current.dateVersion),
    locations: [LOCATION],
    locationsVersion: bump(current.locationsVersion),
    photos,
    participants,
    comments: COMMENTS.map((comment) => ({
      ...comment,
      version: bump(current.comments.find((c) => c.memberId === comment.memberId)?.version ?? 0),
      createdAt: at,
      updatedAt: at,
    })),
    revision: current.revision + 1,
    updatedAt: at,
  };
  // 캡션은 사진 ID로 붙음: P1은 완성 문장, P2는 경진이 쓰던 문장
  const withCaptions: MockBundle = {
    ...base,
    photos: photos.map((photo) =>
      photo.photoId === MOCK_PHOTO_IDS.P1 || photo.photoId === MOCK_PHOTO_IDS.P2
        ? {
            ...photo,
            caption: photo.photoId === MOCK_PHOTO_IDS.P1 ? CAPTIONS.P1 : CAPTIONS.P2,
            captionVersion: bump(photo.captionVersion),
            captionUpdatedBy: memberA,
            captionUpdatedAt: at,
          }
        : photo,
    ),
  };

  return {
    ...state,
    bundles: state.bundles.map((bundle) => (bundle.id === bundleId ? withCaptions : bundle)),
    bundleLeases: [
      ...state.bundleLeases.filter((lease) => lease.bundleId !== bundleId),
      ...stateBLeases(withCaptions),
    ],
  };
};

/** 진행 중이던 초안을 상태 B로 되돌림(가짜 DB에 반영) */
export const restoreStateB = (bundleId: number) =>
  mockDb.update((state) => restoreUtStateB(state, bundleId));

/** 상태 A로 초기화: 가짜 DB를 시작 데이터로 되돌림(만든 초안·발행한 번들·편집권이 모두 사라지고 기존 번들 2개만 남음) */
export const resetToStateA = () => mockDb.reset();

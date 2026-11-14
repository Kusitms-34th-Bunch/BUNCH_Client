import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { isBlockedBetween, viewerBunchId } from './follows';
import { myMembershipsByRecent } from './members';

// 팔로잉·공개 피드(명세 025). 구간·광고 규칙은 명세, 응답 모양은 Swagger `FeedResponse`
const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;
const FOLLOWING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
// 누적 번들 6개마다 광고
const AD_EVERY = 6;

// ponytail: 광고는 가짜 DB에 넣지 않고 고정 목록, 광고 숨김·콕 연결(API 연동 10번) 때 DB로 옮김
const MOCK_ADS = [
  {
    id: 71,
    name: '플로디스튜디오',
    introduction: '여기서 뭉쳐봐요!',
    photoUrl: '/mock/photos/AD1.jpg',
    tags: ['최대 4인', '1인 5~6만원', '예약 가능', '프라이빗 클래스'],
    externalLink: null,
    place: {
      provider: 'kakao',
      externalId: 'ad-71',
      name: '플로디스튜디오',
      address: '서울숲역 도보 7분',
    },
    pinned: false,
    pinId: null,
  },
];

type Cursor = { anchor: string; offset: number; context: string };

const encodeCursor = (cursor: Cursor) => btoa(JSON.stringify(cursor));
const decodeCursor = (value: string): Cursor | undefined => {
  try {
    const parsed: unknown = JSON.parse(atob(value));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'anchor' in parsed &&
      'offset' in parsed &&
      'context' in parsed &&
      typeof parsed.anchor === 'string' &&
      typeof parsed.offset === 'number' &&
      Number.isSafeInteger(parsed.offset) &&
      parsed.offset >= 0 &&
      typeof parsed.context === 'string'
    ) {
      return { anchor: parsed.anchor, offset: parsed.offset, context: parsed.context };
    }
  } catch {
    // 해석할 수 없는 커서
  }
  return undefined;
};

/** 커서를 받은 뒤 지금 번치·소속·승인 팔로우가 바뀌었는지 가리는 값(바뀌면 FEED_001) */
const contextOf = (state: MockDbState, viewer: number | undefined) => {
  const mine = myMembershipsByRecent(state)
    .map((membership) => membership.bunchId)
    .sort((a, b) => a - b);
  const follows = state.follows
    .filter((follow) => follow.followerBunchId === viewer && follow.status === 'FOLLOWING')
    .map((follow) => follow.targetBunchId)
    .sort((a, b) => a - b);
  return `${viewer ?? '-'}|${mine.join(',')}|${follows.join(',')}`;
};

const newestFirst = (a: MockBundle, b: MockBundle) =>
  (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.id - a.id;

/** 기준 시각의 피드 번들 전체(팔로잉 구간 → 공개 구간) */
const feedBundles = (state: MockDbState, viewer: number | undefined, anchor: string) => {
  const anchorMs = Date.parse(anchor);
  const mine = new Set(myMembershipsByRecent(state).map((membership) => membership.bunchId));
  const followed = new Set(
    state.follows
      .filter((follow) => follow.followerBunchId === viewer && follow.status === 'FOLLOWING')
      .map((follow) => follow.targetBunchId),
  );
  const visible = state.bundles.filter(
    (bundle) =>
      bundle.status === 'PUBLISHED' &&
      bundle.visibility === 'PUBLIC' &&
      bundle.publishedAt !== null &&
      Date.parse(bundle.publishedAt) <= anchorMs &&
      !isBlockedBetween(state, viewer, bundle.bunchId),
  );
  const following = visible
    .filter(
      (bundle) =>
        followed.has(bundle.bunchId) &&
        Date.parse(bundle.publishedAt ?? '') >= anchorMs - FOLLOWING_WINDOW_MS,
    )
    .sort(newestFirst);
  const followingIds = new Set(following.map((bundle) => bundle.id));
  const isPublicBunch = (bunchId: number) =>
    state.bunches.some((bunch) => bunch.id === bunchId && !bunch.isPrivate);
  const publicBundles = visible
    .filter(
      (bundle) =>
        !followingIds.has(bundle.id) && !mine.has(bundle.bunchId) && isPublicBunch(bundle.bunchId),
    )
    .sort(newestFirst);
  return [
    ...following.map((bundle) => ({ segment: 'FOLLOWING' as const, bundle })),
    ...publicBundles.map((bundle) => ({ segment: 'PUBLIC' as const, bundle })),
  ];
};

const cardOf = (state: MockDbState, bundle: MockBundle) => {
  const bunch = state.bunches.find((item) => item.id === bundle.bunchId);
  return {
    id: bundle.id,
    bunch: {
      id: bundle.bunchId,
      name: bunch?.name ?? '',
      imageUrl: bunch?.imageUrl ?? null,
      characterType: bunch?.characterType ?? 'TYPE_1',
      visibility: bunch?.isPrivate ? 'PRIVATE' : 'PUBLIC',
    },
    publishedAt: bundle.publishedAt,
    title: bundle.title,
    date: bundle.date,
    coverImageUrl: bundle.photos[0]?.imageUrl ?? null,
    photos: bundle.photos.map(({ id, imageUrl, position }) => ({ id, imageUrl, position })),
    // 가짜 DB 장소에는 행 ID가 없어 번들 ID로 만든 값
    locations: bundle.locations.map((location, index) => ({
      id: bundle.id * 10 + index + 1,
      provider: location.provider,
      externalId: location.externalId,
      name: location.name,
      address: location.address || null,
      position: index,
    })),
    participants: bundle.participants.map(({ memberId, joinedAt }) => {
      const member = state.members.find((item) => item.memberId === memberId);
      return {
        memberId: member ? memberId : null,
        joinedAt,
        nickname: member?.nickname ?? '작성자',
        imageUrl: member?.imageUrl ?? null,
        profileAvailable: member !== undefined,
        role: null,
        creator: false,
      };
    }),
    // ponytail: 좋아요·소셜 댓글은 가짜 DB에 없어 0, 좋아요·댓글 연결(API 연동 3·4번) 때 채움
    likeCount: 0,
    likedByCurrentBunch: false,
    commentCount: 0,
  };
};

/** 지금 회원·소속으로 프로필을 보일 수 있는 멤버(없으면 「작성자」, 명세 084) */
const profileOf = (state: MockDbState, bunchId: number, memberId: number) => {
  const member = state.members.find((item) => item.memberId === memberId);
  const active = state.memberships.some(
    (item) => item.bunchId === bunchId && item.memberId === memberId,
  );
  return member && active
    ? { nickname: member.nickname, imageUrl: member.imageUrl, profileAvailable: true }
    : { nickname: '작성자', imageUrl: null, profileAvailable: false };
};

/** 발행 번들 상세(명세 084, Swagger `BunchPublicBundleDetail`). 볼 수 없으면 오류 응답 */
const publicDetailOf = (state: MockDbState, bunchId: number, bundleId: number) => {
  const bunch = state.bunches.find((item) => item.id === bunchId);
  if (!bunch) return fail(404, 'BUNCH_009');
  const bundle = state.bundles.find((item) => item.id === bundleId);
  // 없는·초안·경로가 다른·멤버 공개(PRIVATE) 발행본은 외부 상세에서 없음
  if (
    !bundle ||
    bundle.bunchId !== bunchId ||
    bundle.status !== 'PUBLISHED' ||
    bundle.visibility !== 'PUBLIC'
  ) {
    return fail(404, 'RESOURCE_001');
  }
  const viewer = viewerBunchId(state);
  // 권한·접근은 지금 번치 명의로 판단(다른 소속 번치의 역할은 보지 않음)
  const mine =
    viewer === bunchId
      ? state.memberships.find(
          (item) => item.bunchId === bunchId && item.memberId === MOCK_MY_MEMBER_ID,
        )
      : undefined;
  const approved = state.follows.some(
    (follow) =>
      follow.followerBunchId === viewer &&
      follow.targetBunchId === bunchId &&
      follow.status === 'FOLLOWING',
  );
  // 비공개 번치의 공개 번들은 승인된 팔로워 번치만
  if (isBlockedBetween(state, viewer, bunchId) || (bunch.isPrivate && !mine && !approved)) {
    return fail(403, 'AUTH_002');
  }
  const owner = mine?.role === 'OWNER';
  const locations = cardOf(state, bundle).locations;
  return ok({
    id: bundle.id,
    bunchId,
    title: bundle.title,
    coverImageUrl: bundle.photos[0]?.imageUrl ?? null,
    date: bundle.date,
    // 명세: 옛 단일 장소 필드라 null, 장소는 locations
    location: null,
    publishedAt: bundle.publishedAt,
    // ponytail: 가짜 DB에 픽이 없어 모두 0, 사진 픽은 상세 화면에서 읽기만
    photos: bundle.photos.map(({ id, imageUrl, position }) => ({
      id,
      imageUrl,
      position,
      picks: { count: 0, pickedByMe: false, version: 0, members: [] },
    })),
    contributors: bundle.participants.map(({ memberId }) => ({
      memberId,
      ...profileOf(state, bunchId, memberId),
    })),
    comments: bundle.comments.map((comment, index) => {
      const profile = profileOf(state, bunchId, comment.memberId);
      return {
        id: bundle.id * 100 + index + 1,
        memberId: comment.memberId,
        ...profile,
        content: profile.profileAvailable ? comment.content : '삭제된 코멘트입니다',
        updatedAt: comment.updatedAt,
      };
    }),
    locations,
    revision: bundle.revision,
    visibility: bundle.visibility,
    permissions: {
      administrator: owner,
      creator: bundle.createdBy === MOCK_MY_MEMBER_ID,
      participant: bundle.participants.some(({ memberId }) => memberId === MOCK_MY_MEMBER_ID),
      canEdit: owner,
      canPublish: false,
      canDelete: owner,
      // 기능명세서 6.2.11: 메인 관리자가 아니면 우리 번치 번들도 신고
      canReport: viewer !== undefined && !owner,
      canLike: viewer !== undefined,
      canComment: viewer !== undefined,
    },
    // ponytail: 좋아요·소셜 댓글은 가짜 DB에 없어 0, 좋아요·댓글 연결(API 연동 3·4번) 때 채움
    likeCount: 0,
    likedByCurrentBunch: false,
    commentCount: 0,
  });
};

export const feedHandlers = [
  // GET /api/v1/bunches/{bunchId}/published-bundles/{bundleId}
  http.get('/api/bunches/:bunchId/published-bundles/:bundleId', ({ params }) => {
    const bunchId = toWireId(params.bunchId);
    const bundleId = toWireId(params.bundleId);
    if (bunchId === undefined || bundleId === undefined) return fail(400, 'COMMON_001');
    return publicDetailOf(mockDb.get(), bunchId, bundleId);
  }),

  // GET /api/v1/feed?size=&cursor=
  http.get('/api/feed', ({ request }) => {
    const url = new URL(request.url);
    const sizeParam = url.searchParams.get('size');
    const size = sizeParam === null ? DEFAULT_SIZE : Number(sizeParam);
    if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const viewer = viewerBunchId(state);
    const context = contextOf(state, viewer);
    const cursorParam = url.searchParams.get('cursor');
    let anchor = new Date().toISOString();
    let offset = 0;
    if (cursorParam !== null) {
      const cursor = decodeCursor(cursorParam);
      if (!cursor) return fail(400, 'COMMON_001');
      if (cursor.context !== context) return fail(409, 'FEED_001');
      anchor = cursor.anchor;
      offset = cursor.offset;
    }

    const all = feedBundles(state, viewer, anchor);
    const lastFollowing = all.findLastIndex((entry) => entry.segment === 'FOLLOWING');
    const page = all.slice(offset, offset + size);
    const items: unknown[] = [];
    page.forEach((entry, index) => {
      const position = offset + index;
      items.push({ type: 'BUNDLE', segment: entry.segment, bundle: cardOf(state, entry.bundle) });
      if ((position + 1) % AD_EVERY === 0) {
        const ad = MOCK_ADS[((position + 1) / AD_EVERY - 1) % MOCK_ADS.length];
        if (ad)
          items.push({
            type: 'ADVERTISEMENT',
            advertisement: { ...ad, canPin: viewer !== undefined },
          });
      }
      if (position === lastFollowing) items.push({ type: 'FOLLOWING_CAUGHT_UP' });
    });
    const next =
      offset + size < all.length ? encodeCursor({ anchor, offset: offset + size, context }) : null;
    return ok({
      anchorTime: anchor,
      currentBunchId: viewer ?? null,
      canInteract: viewer !== undefined,
      size,
      bundleCount: page.length,
      items,
      nextCursor: next,
      hasNext: next !== null,
      endReached: next === null,
    });
  }),
];

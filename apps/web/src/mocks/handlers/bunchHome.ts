import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { toSnapshot } from './bundles';
import { followCounts, followOf, isBlockedBetween, viewerBunchId } from './follows';
import { unreadCountOf } from './notifications';

// 번치 홈 조회(`/home`, 서버 PR #62 미병합 계약), 번들 목록·현황(Swagger) 기준, 명세에 없는 값은 `ponytail:`로 표시
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// 번치 존재(404)·내 소속(403) 순서로 확인, 없는 번치의 오류 코드는 명세마다 달라 호출하는 쪽이 정함
// (번치 홈·발행 번들 목록은 BUNCH_009, 번들 목록·현황은 RESOURCE_001)
type NotFoundCode = 'BUNCH_009' | 'RESOURCE_001';
const findBunch = (
  bunchIdParam: string | readonly string[] | undefined,
  notFoundCode: NotFoundCode,
  external = false,
) => {
  const bunchId = toWireId(bunchIdParam);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  const bunch = state.bunches.find((item) => item.id === bunchId);
  if (!bunch) return { error: fail(404, notFoundCode) };
  const mine = state.memberships.find(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  );
  if (!mine) {
    // 다른 번치(EXTERNAL)는 프로필·공개 번들만 내 번치 명의로 조회
    if (external) return { bunchId, bunch, mine: undefined, state };
    return { error: fail(403, 'AUTH_002') };
  }
  return { bunchId, bunch, mine, state };
};

/** 다른 번치를 내 번치(지금 번치)가 볼 수 있는지: 공개거나 팔로우가 승인됐으면 번들·목록을 봄 */
const externalAccess = (state: MockDbState, bunchId: number, isPrivate: boolean) => {
  const viewer = viewerBunchId(state);
  const follow = followOf(state, viewer, bunchId);
  return { viewer, follow, canView: !isPrivate || follow?.status === 'FOLLOWING' };
};

const counts = (state: MockDbState, bunchId: number) => {
  const bundles = state.bundles.filter((bundle) => bundle.bunchId === bunchId);
  const draftCount = bundles.filter((bundle) => bundle.status === 'DRAFT').length;
  const publishedCount = bundles.length - draftCount;
  // 명세(PR #62) Stage: 발행본 0~1개=1, 2~5개=2, 6~9개=3, 10개 이상=4
  const stage = publishedCount >= 10 ? 4 : publishedCount >= 6 ? 3 : publishedCount >= 2 ? 2 : 1;
  return { draftCount, publishedCount, stage };
};

const parseNonNegativeInt = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  // 빈 문자열은 숫자 0이 아니라 잘못된 입력
  if (value.trim() === '') return NaN;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : NaN;
};

export const bunchHomeHandlers = [
  // GET /api/v1/bunches/{bunchId}/home
  // 내 번치·다른 번치의 응답 모양이 달라 반환을 Response로 둠
  http.get('/api/bunches/:bunchId/home', ({ params }): Response => {
    const found = findBunch(params.bunchId, 'BUNCH_009', true);
    if ('error' in found) return found.error;
    const { bunch, mine, state, bunchId } = found;
    const profile = {
      id: bunch.id,
      name: bunch.name,
      imageUrl: bunch.imageUrl,
      characterType: bunch.characterType,
      visibility: bunch.isPrivate ? 'PRIVATE' : 'PUBLIC',
      introduction: bunch.introduction,
    };
    const memberTotal = state.memberships.filter((m) => m.bunchId === bunchId).length;
    if (!mine) {
      const { viewer, follow, canView } = externalAccess(state, bunchId, bunch.isPrivate);
      // ponytail: 차단 관계의 응답은 명세에 없어 403으로 둠(화면은 접근 제한), 실서버 확인 필요
      if (isBlockedBetween(state, viewer, bunchId)) return fail(403, 'AUTH_002');
      // ponytail: 비소속 번치의 버전·개수·권한은 명세에 값이 없어 null·false(차단만 가능)
      return ok({
        bunch: profile,
        myMembership: null,
        permissions: {
          canEditProfile: false,
          canDeleteBunch: false,
          canManageRoles: false,
          canTransferOwner: false,
          canBlock: true,
          canInvite: false,
          canLeave: false,
        },
        memberCount: memberTotal,
        ...followCounts(state, bunchId),
        stage: counts(state, bunchId).stage,
        currentBunchId: viewer ?? null,
        accessScope: 'EXTERNAL',
        followState: follow?.status ?? 'NONE',
        followId: follow?.id ?? null,
        canViewBundles: canView,
        canViewMembers: canView,
        canViewRelations: canView,
        isCurrentBunch: false,
      });
    }
    const isOwner = mine.role === 'OWNER';
    const isAdmin = mine.role !== 'MEMBER';
    const memberCount = state.memberships.filter((m) => m.bunchId === bunchId).length;
    return ok({
      bunch: {
        id: bunch.id,
        name: bunch.name,
        imageUrl: bunch.imageUrl,
        characterType: bunch.characterType,
        visibility: bunch.isPrivate ? 'PRIVATE' : 'PUBLIC',
        introduction: bunch.introduction,
      },
      // ponytail: membershipId·joinedAt은 가짜 DB에 없어 회원 ID와 고정 시각으로 대신함
      myMembership: {
        membershipId: mine.memberId,
        role: mine.role,
        joinedAt: '2026-08-01T00:00:00.000Z',
      },
      permissions: {
        canEditProfile: isOwner,
        canDeleteBunch: isOwner,
        canManageRoles: isOwner,
        canTransferOwner: isOwner,
        canBlock: isAdmin,
        canInvite: isAdmin,
        canLeave: memberCount > 1,
      },
      profileVersion: bunch.profileVersion ?? 1,
      membershipVersion: bunch.membershipVersion ?? 1,
      memberCount,
      ...followCounts(state, bunchId),
      ...counts(state, bunchId),
      unreadCount: unreadCountOf(state, bunchId),
      currentBunchId: viewerBunchId(state) ?? null,
      accessScope: 'INTERNAL',
      followState: 'NONE',
      followId: null,
      canViewBundles: true,
      canViewMembers: true,
      canViewRelations: true,
      isCurrentBunch: viewerBunchId(state) === bunchId,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/bundles?status=&page=&size=
  // 초안은 수정 최신순(updatedAt, id 내림차순), 발행본은 발행 최신순(publishedAt, id 내림차순)
  http.get('/api/bunches/:bunchId/bundles', ({ params, request }) => {
    const found = findBunch(params.bunchId, 'RESOURCE_001');
    if ('error' in found) return found.error;
    const { bunchId, mine, state } = found;
    if (!mine) return fail(403, 'AUTH_002');
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseNonNegativeInt(url.searchParams.get('page'), 0);
    const size = parseNonNegativeInt(url.searchParams.get('size'), DEFAULT_PAGE_SIZE);
    if (
      (status !== 'DRAFT' && status !== 'PUBLISHED') ||
      Number.isNaN(page) ||
      Number.isNaN(size) ||
      size < 1 ||
      size > MAX_PAGE_SIZE
    ) {
      return fail(400, 'COMMON_001');
    }

    const matched = state.bundles
      .filter((bundle) => bundle.bunchId === bunchId && bundle.status === status)
      .sort((a, b) => {
        const key = status === 'PUBLISHED' ? 'publishedAt' : 'updatedAt';
        return (b[key] ?? '').localeCompare(a[key] ?? '') || b.id - a.id;
      });
    return ok({
      items: matched
        .slice(page * size, (page + 1) * size)
        .map((bundle) => toSnapshot(bundle, state, mine.role)),
      page,
      size,
      total: matched.length,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/published-bundles?page=&size= (서버 PR #62 미병합 계약, 번치 홈 「완성된 번들」용)
  // 내 번치(INTERNAL)는 공개 범위와 상관없이 발행본 전체, 발행 최신순(publishedAt, id 내림차순), 초안은 포함하지 않음
  http.get('/api/bunches/:bunchId/published-bundles', ({ params, request }) => {
    const found = findBunch(params.bunchId, 'BUNCH_009', true);
    if ('error' in found) return found.error;
    const { bunchId, state, mine, bunch } = found;
    // 다른 번치는 볼 수 있을 때만(비공개는 팔로우 승인 뒤), 공개 번들만
    if (
      !mine &&
      (!externalAccess(state, bunchId, bunch.isPrivate).canView ||
        isBlockedBetween(state, viewerBunchId(state), bunchId))
    ) {
      return fail(403, 'AUTH_002');
    }
    const url = new URL(request.url);
    const page = parseNonNegativeInt(url.searchParams.get('page'), 0);
    const size = parseNonNegativeInt(url.searchParams.get('size'), DEFAULT_PAGE_SIZE);
    if (Number.isNaN(page) || Number.isNaN(size) || size < 1 || size > MAX_PAGE_SIZE) {
      return fail(400, 'COMMON_001');
    }
    const published = state.bundles
      .filter(
        (bundle) =>
          bundle.bunchId === bunchId &&
          bundle.status === 'PUBLISHED' &&
          (mine !== undefined || bundle.visibility === 'PUBLIC'),
      )
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.id - a.id);
    return ok({
      items: published.slice(page * size, (page + 1) * size).map((bundle) => ({
        id: bundle.id,
        bunchId: bundle.bunchId,
        title: bundle.title,
        // 표지는 번들 첫 사진
        coverImageUrl: bundle.photos[0]?.imageUrl ?? null,
        date: bundle.date,
        // 명세: 저장 정보가 없어 null
        location: null,
        publishedAt: bundle.publishedAt,
        visibility: bundle.visibility,
      })),
      page,
      size,
      totalElements: published.length,
      hasNext: (page + 1) * size < published.length,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/bundles/summary
  http.get('/api/bunches/:bunchId/bundles/summary', ({ params }) => {
    const found = findBunch(params.bunchId, 'RESOURCE_001');
    if ('error' in found) return found.error;
    return ok(counts(found.state, found.bunchId));
  }),

  // GET /api/v1/bunches/{bunchId}/members: 내부·외부 공통. 다른 번치는 공개거나 팔로우 승인 뒤, 차단이면 BUNCH_009
  // 정렬은 OWNER → CO_OWNER → MEMBER, 같은 역할은 닉네임 순(ponytail: 서버의 C collation 대신 기본 문자열 비교)
  http.get('/api/bunches/:bunchId/members', ({ params }) => {
    const found = findBunch(params.bunchId, 'BUNCH_009', true);
    if ('error' in found) return found.error;
    const { bunchId, state, mine, bunch } = found;
    if (!mine) {
      const { viewer, canView } = externalAccess(state, bunchId, bunch.isPrivate);
      if (isBlockedBetween(state, viewer, bunchId)) return fail(404, 'BUNCH_009');
      if (!canView) return fail(403, 'AUTH_002');
    }
    const order = { OWNER: 0, CO_OWNER: 1, MEMBER: 2 } as const;
    return ok(
      state.memberships
        .filter((membership) => membership.bunchId === bunchId)
        .flatMap((membership) => {
          const member = state.members.find((item) => item.memberId === membership.memberId);
          return member
            ? [
                {
                  memberId: member.memberId,
                  nickname: member.nickname,
                  imageUrl: member.imageUrl,
                  role: membership.role,
                },
              ]
            : [];
        })
        .sort(
          (a, b) =>
            order[a.role] - order[b.role] || (a.nickname ?? '').localeCompare(b.nickname ?? ''),
        ),
    );
  }),
];

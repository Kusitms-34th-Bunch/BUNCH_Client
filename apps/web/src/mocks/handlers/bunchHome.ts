import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { toSnapshot } from './bundles';

// 번치 홈 조회(`/home`, 서버 PR #62 미병합 계약), 번들 목록·현황(Swagger) 기준, 명세에 없는 값은 `ponytail:`로 표시
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// 번치 존재(404)·내 소속(403) 순서로 확인
const findBunch = (bunchIdParam: string | readonly string[] | undefined) => {
  const bunchId = toWireId(bunchIdParam);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  const bunch = state.bunches.find((item) => item.id === bunchId);
  if (!bunch) return { error: fail(404, 'RESOURCE_001') };
  const mine = state.memberships.find(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  );
  if (!mine) return { error: fail(403, 'AUTH_002') };
  return { bunchId, bunch, mine, state };
};

const counts = (state: MockDbState, bunchId: number) => {
  const bundles = state.bundles.filter((bundle) => bundle.bunchId === bunchId);
  const draftCount = bundles.filter((bundle) => bundle.status === 'DRAFT').length;
  const publishedCount = bundles.length - draftCount;
  // 현재 dev 기준 Stage: 발행본 0~3개=1, 4~7개=2, 8~11개=3, 12~15개=4, 16개 이상=5(PR #55는 1~4로 바뀔 예정)
  const stage = Math.min(5, Math.floor(publishedCount / 4) + 1);
  return { draftCount, publishedCount, stage };
};

const parseNonNegativeInt = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : NaN;
};

export const bunchHomeHandlers = [
  // GET /api/v1/bunches/{bunchId}/home
  http.get('/api/bunches/:bunchId/home', ({ params }) => {
    const found = findBunch(params.bunchId);
    if ('error' in found) return found.error;
    const { bunch, mine, state, bunchId } = found;
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
      profileVersion: 1,
      membershipVersion: 1,
      memberCount,
      followerCount: bunch.followerCount,
      followingCount: bunch.followingCount,
      ...counts(state, bunchId),
      unreadCount: 0,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/bundles?status=&page=&size=
  // 초안은 수정 최신순(updatedAt, id 내림차순), 발행본은 발행 최신순(publishedAt, id 내림차순)
  http.get('/api/bunches/:bunchId/bundles', ({ params, request }) => {
    const found = findBunch(params.bunchId);
    if ('error' in found) return found.error;
    const { bunchId, mine, state } = found;
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

  // GET /api/v1/bunches/{bunchId}/bundles/summary
  http.get('/api/bunches/:bunchId/bundles/summary', ({ params }) => {
    const found = findBunch(params.bunchId);
    if ('error' in found) return found.error;
    return ok(counts(found.state, found.bunchId));
  }),
];

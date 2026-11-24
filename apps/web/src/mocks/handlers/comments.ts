import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/client/idempotencyKey';
import { toWireId } from '@/shared/api/client/ids';
import type { MockDbState, MockSocialComment } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { failIfProhibited } from '../lib/prohibitedWord';
import { isBlockedBetween, viewerBunchId } from './follows';
import { bundleAccess } from './likes';

// 번들 소셜 댓글·답글(명세 014~017, Swagger `SocialCommentItem`·`SocialCommentPage`)
const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;
const MAX_LENGTH = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 지금 번치에 보이는 댓글(차단 관계 번치가 쓴 것과 그 원댓글의 답글은 빠짐, 삭제 자리는 남음) */
export const visibleOf = (state: MockDbState, viewer: number | undefined, bundleId: number) => {
  const shown = (comment: MockSocialComment) => !isBlockedBetween(state, viewer, comment.bunchId);
  const all = state.socialComments.filter((comment) => comment.bundleId === bundleId);
  const hiddenRoots = new Set(all.filter((c) => !c.parentId && !shown(c)).map((c) => c.id));
  return all.filter((c) => shown(c) && !(c.parentId && hiddenRoots.has(c.parentId)));
};

/** 번들 전체 댓글·답글 수(삭제 포함, 숨김 제외). 피드 카드·상세의 `commentCount`와 목록의 `totalCount` */
export const commentCountOf = (state: MockDbState, viewer: number | undefined, bundleId: number) =>
  visibleOf(state, viewer, bundleId).length;

const itemOf = (state: MockDbState, viewer: number | undefined, comment: MockSocialComment) => {
  const replyCount = comment.parentId
    ? 0
    : visibleOf(state, viewer, comment.bundleId).filter((c) => c.parentId === comment.id).length;
  const base = { id: comment.id, bundleId: comment.bundleId, parentId: comment.parentId };
  const member = state.members.find((item) => item.memberId === comment.memberId);
  // 탈퇴한 작성자의 댓글도 삭제 자리로(6.2.7 로직 5)
  if (comment.deleted || !member) {
    return {
      ...base,
      content: '삭제된 댓글입니다',
      deleted: true,
      createdAt: null,
      author: { memberId: null, nickname: '작성자', imageUrl: null },
      badge: null,
      replyCount,
      canDelete: false,
      canReply: false,
      canReport: false,
    };
  }
  const bunch = state.bunches.find((item) => item.id === comment.bunchId);
  const mine = comment.memberId === MOCK_MY_MEMBER_ID;
  const hasBunch = viewer !== undefined;
  return {
    ...base,
    content: comment.content,
    deleted: false,
    createdAt: comment.createdAt,
    author: { memberId: member.memberId, nickname: member.nickname, imageUrl: member.imageUrl },
    badge: bunch
      ? { bunchId: bunch.id, name: bunch.name, characterType: bunch.characterType }
      : null,
    replyCount,
    canDelete: mine && hasBunch,
    canReply: !comment.parentId && hasBunch,
    canReport: !mine && hasBunch,
  };
};

type Cursor = { offset: number; context: string };
const encodeCursor = (cursor: Cursor) => btoa(JSON.stringify(cursor));
const decodeCursor = (value: string): Cursor | undefined => {
  try {
    const cursor = JSON.parse(atob(value)) as Partial<Cursor>;
    return typeof cursor.offset === 'number' && typeof cursor.context === 'string'
      ? { offset: cursor.offset, context: cursor.context }
      : undefined;
  } catch {
    return undefined;
  }
};

/** 쪽 응답. 커서는 번들·부모·지금 번치에 묶여 다르면 400 */
const pageOf = (
  request: Request,
  state: MockDbState,
  viewer: number | undefined,
  bundleId: number,
  list: MockSocialComment[],
  parentId: number | null,
) => {
  const url = new URL(request.url);
  const sizeParam = url.searchParams.get('size');
  const size = sizeParam === null || sizeParam === '' ? DEFAULT_SIZE : Number(sizeParam);
  if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) return fail(400, 'COMMON_001');
  const context = `${bundleId}:${parentId ?? '-'}:${viewer ?? '-'}`;
  const cursorParam = url.searchParams.get('cursor');
  let offset = 0;
  if (cursorParam !== null) {
    const cursor = decodeCursor(cursorParam);
    if (!cursor || cursor.context !== context) return fail(400, 'COMMON_001');
    offset = cursor.offset;
  }
  const items = list.slice(offset, offset + size);
  const next =
    offset + size < list.length ? encodeCursor({ offset: offset + size, context }) : null;
  return ok({
    items: items.map((comment) => itemOf(state, viewer, comment)),
    nextCursor: next,
    hasNext: next !== null,
    totalCount: commentCountOf(state, viewer, bundleId),
  });
};

const byNewest = (a: MockSocialComment, b: MockSocialComment) =>
  b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
const byOldest = (a: MockSocialComment, b: MockSocialComment) => -byNewest(a, b);

const readJson = async (request: Request): Promise<Record<string, unknown> | undefined> => {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

export const commentHandlers = [
  // GET /api/v1/bundles/{bundleId}/comments?size=&cursor= — 원댓글 최신순
  http.get('/api/bundles/:bundleId/comments', ({ params, request }) => {
    const bundleId = toWireId(params.bundleId);
    if (bundleId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId, false);
    if ('error' in access) return access.error;
    const roots = visibleOf(state, access.viewer, bundleId)
      .filter((comment) => !comment.parentId)
      .sort(byNewest);
    return pageOf(request, state, access.viewer, bundleId, roots, null);
  }),

  // GET /api/v1/bundles/{bundleId}/comments/{commentId}/replies — 답글 오래된 순
  http.get('/api/bundles/:bundleId/comments/:commentId/replies', ({ params, request }) => {
    const bundleId = toWireId(params.bundleId);
    const commentId = toWireId(params.commentId);
    if (bundleId === undefined || commentId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId, false);
    if ('error' in access) return access.error;
    const visible = visibleOf(state, access.viewer, bundleId);
    const parent = visible.find((comment) => comment.id === commentId);
    if (!parent) return fail(404, 'RESOURCE_001');
    if (parent.parentId) return fail(400, 'COMMON_001');
    const replies = visible.filter((comment) => comment.parentId === commentId).sort(byOldest);
    return pageOf(request, state, access.viewer, bundleId, replies, commentId);
  }),

  // POST /api/v1/bundles/{bundleId}/comments — 지금 번치 명의 원댓글·답글, 같은 키·내용·부모면 처음 결과
  http.post('/api/bundles/:bundleId/comments', async ({ params, request }) => {
    const bundleId = toWireId(params.bundleId);
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    if (!body || typeof body.content !== 'string') return fail(400, 'COMMON_002');
    const content = body.content.trim();
    const parentId = body.parentId ?? null;
    if (
      bundleId === undefined ||
      !key ||
      !UUID.test(key) ||
      !content ||
      [...new Intl.Segmenter().segment(content)].length > MAX_LENGTH ||
      (parentId !== null && (!Number.isSafeInteger(parentId) || (parentId as number) <= 0))
    ) {
      return fail(400, 'COMMON_001');
    }
    const prohibited = failIfProhibited({ content });
    if (prohibited) return prohibited;
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId);
    if ('error' in access) return access.error;
    const viewer = access.viewer as number;
    // 원댓글 검사는 새로 등록할 때만(같은 키로 다시 보내면 그사이 원댓글이 지워졌어도 처음 결과를 돌려줌)
    const outcome = runIdempotent(
      `comment:${MOCK_MY_MEMBER_ID}:${viewer}:${bundleId}`,
      key,
      JSON.stringify([content, parentId]),
      () => {
        const current = mockDb.get();
        if (parentId !== null) {
          const parent = visibleOf(current, viewer, bundleId).find((item) => item.id === parentId);
          if (!parent) return { status: 404, body: 'RESOURCE_001' };
          if (parent.deleted || parent.parentId) return { status: 409, body: 'BUNDLE_002' };
        }
        const comment: MockSocialComment = {
          id: Math.max(5000, ...current.socialComments.map((item) => item.id)) + 1,
          bundleId,
          parentId: parentId as number | null,
          memberId: MOCK_MY_MEMBER_ID,
          bunchId: viewer,
          content,
          createdAt: new Date().toISOString(),
          deleted: false,
        };
        mockDb.update((next) => ({ ...next, socialComments: [...next.socialComments, comment] }));
        return { status: 200, body: comment.id };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    if (outcome.response.status !== 200) {
      return fail(outcome.response.status, outcome.response.body as string);
    }
    // 다시 보낸 요청은 지금 상태로(그사이 지웠으면 삭제 자리)
    const latest = mockDb.get();
    const saved = latest.socialComments.find((item) => item.id === outcome.response.body);
    return saved ? ok(itemOf(latest, viewer, saved)) : fail(404, 'RESOURCE_001');
  }),

  // DELETE /api/v1/bundles/{bundleId}/comments/{commentId} — 작성자만, 다시 지워도 같은 삭제 자리
  http.delete('/api/bundles/:bundleId/comments/:commentId', ({ params }) => {
    const bundleId = toWireId(params.bundleId);
    const commentId = toWireId(params.commentId);
    if (bundleId === undefined || commentId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId);
    if ('error' in access) return access.error;
    const comment = state.socialComments.find(
      (item) => item.id === commentId && item.bundleId === bundleId,
    );
    if (!comment) return fail(404, 'RESOURCE_001');
    if (comment.memberId !== MOCK_MY_MEMBER_ID) return fail(403, 'AUTH_002');
    mockDb.update((current) => ({
      ...current,
      socialComments: current.socialComments.map((item) =>
        item.id === commentId ? { ...item, deleted: true } : item,
      ),
    }));
    const latest = mockDb.get();
    return ok(itemOf(latest, viewerBunchId(latest), { ...comment, deleted: true }));
  }),
];

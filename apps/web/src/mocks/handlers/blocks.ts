import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockBlock, MockReport } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { cardOf, isMine, paged, pageOf } from './follows';

// 번치 차단·신고(Swagger). 명세에 오류 코드가 없어 권한은 AUTH_002, 잘못된 입력은 COMMON_001로 둠
const REPORT_REASONS: readonly MockReport['reason'][] = [
  'SPAM',
  'INAPPROPRIATE',
  'HARASSMENT',
  'PERSONAL_INFORMATION',
  'OTHER',
];

/** 경로의 내 번치(명의)와 상대 번치. 내가 속한 번치가 아니면 403, 없는 상대는 404 */
const pairOf = (params: Record<string, string | readonly string[] | undefined>) => {
  const viewerId = toWireId(params.viewerId);
  const targetId = toWireId(params.targetId);
  if (viewerId === undefined || targetId === undefined || viewerId === targetId) {
    return { error: fail(400, 'COMMON_001') };
  }
  const state = mockDb.get();
  if (!isMine(state, viewerId)) return { error: fail(403, 'AUTH_002') };
  if (!state.bunches.some((bunch) => bunch.id === targetId)) {
    return { error: fail(404, 'RESOURCE_001') };
  }
  return { viewerId, targetId, state };
};

const nextId = (items: readonly { id: number }[]) =>
  Math.max(0, ...items.map((item) => item.id)) + 1;

export const blockHandlers = [
  // GET /api/v1/bunches/{viewerId}/blocks?page=&size=: 내 번치가 차단한 번치(최근순)
  http.get('/api/bunches/:viewerId/blocks', ({ params, request }) => {
    const viewerId = toWireId(params.viewerId);
    const page = pageOf(request);
    if (viewerId === undefined || !page) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    if (!isMine(state, viewerId)) return fail(403, 'AUTH_002');
    const items = state.blocks
      .filter((block) => block.blockerBunchId === viewerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .flatMap((block) => {
        const bunch = cardOf(state, block.targetBunchId);
        return bunch ? [{ id: block.id, bunch, blockedAt: block.createdAt }] : [];
      });
    return ok(paged(items, page));
  }),

  // PUT /api/v1/bunches/{viewerId}/blocks/{targetId}: 차단(이미 있으면 그대로). 두 번치 사이 팔로우·요청도 정리
  http.put('/api/bunches/:viewerId/blocks/:targetId', ({ params }) => {
    const found = pairOf(params);
    if ('error' in found) return found.error;
    const { viewerId, targetId, state } = found;
    const exists = state.blocks.some(
      (block) => block.blockerBunchId === viewerId && block.targetBunchId === targetId,
    );
    const block: MockBlock = {
      id: nextId(state.blocks),
      blockerBunchId: viewerId,
      targetBunchId: targetId,
      createdAt: new Date().toISOString(),
    };
    mockDb.update((current) => ({
      ...current,
      blocks: exists ? current.blocks : [...current.blocks, block],
      follows: current.follows.filter(
        (follow) =>
          !(
            (follow.followerBunchId === viewerId && follow.targetBunchId === targetId) ||
            (follow.followerBunchId === targetId && follow.targetBunchId === viewerId)
          ),
      ),
    }));
    return ok(null);
  }),

  // DELETE /api/v1/bunches/{viewerId}/blocks/{targetId}?blockId=: 차단 해제. 다른 차단의 ID면 404
  http.delete('/api/bunches/:viewerId/blocks/:targetId', ({ params, request }) => {
    const found = pairOf(params);
    if ('error' in found) return found.error;
    const blockId = toWireId(new URL(request.url).searchParams.get('blockId') ?? undefined);
    if (blockId === undefined) return fail(400, 'COMMON_001');
    const { viewerId, targetId, state } = found;
    const existing = state.blocks.find(
      (block) =>
        block.id === blockId &&
        block.blockerBunchId === viewerId &&
        block.targetBunchId === targetId,
    );
    if (!existing) return fail(404, 'RESOURCE_001');
    // 차단 해제는 메인·공동 관리자만(기능명세 5.6.2), 차단은 멤버 누구나
    const role = state.memberships.find(
      (item) => item.bunchId === viewerId && item.memberId === MOCK_MY_MEMBER_ID,
    )?.role;
    if (role !== 'OWNER' && role !== 'CO_OWNER') return fail(403, 'AUTH_002');
    mockDb.update((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block !== existing),
    }));
    return ok(null);
  }),

  // POST /api/v1/bunches/{viewerId}/reports { targetBunchId, reason, detail? }: 신고 접수
  http.post('/api/bunches/:viewerId/reports', async ({ params, request }) => {
    const viewerId = toWireId(params.viewerId);
    const body = (await request.json().catch(() => null)) as {
      targetBunchId?: unknown;
      reason?: unknown;
      detail?: unknown;
    } | null;
    const targetId = typeof body?.targetBunchId === 'number' ? body.targetBunchId : undefined;
    const reason = REPORT_REASONS.find((value) => value === body?.reason);
    const detail = typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
    if (viewerId === undefined || targetId === undefined || !reason || viewerId === targetId) {
      return fail(400, 'COMMON_001');
    }
    const state = mockDb.get();
    if (!isMine(state, viewerId)) return fail(403, 'AUTH_002');
    if (!state.bunches.some((bunch) => bunch.id === targetId)) return fail(404, 'RESOURCE_001');
    const report: MockReport = {
      id: nextId(state.reports),
      reporterBunchId: viewerId,
      targetBunchId: targetId,
      reason,
      detail,
    };
    mockDb.update((current) => ({ ...current, reports: [...current.reports, report] }));
    return ok({ reportId: report.id });
  }),
];

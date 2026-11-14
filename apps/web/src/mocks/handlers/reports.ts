import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockReport } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { nextId, REPORT_REASONS } from './blocks';
import { visibleOf } from './comments';
import { bundleAccess } from './likes';

// 번들·댓글 신고(명세 018·019, Swagger `SocialContentReportRequest`). 볼 수 있는 번들만, 지금 번치 명의
// ponytail: 같은 대상 24시간 2회 제한은 서버 오류 코드를 몰라 두지 않음, 코드가 정해지면 3번째를 거절
const report = async (
  request: Request,
  bundleParam: string | readonly string[] | undefined,
  commentParam?: string | readonly string[],
) => {
  const bundleId = toWireId(bundleParam);
  const commentId = commentParam === undefined ? undefined : toWireId(commentParam);
  const body = (await request.json().catch(() => null)) as {
    reason?: unknown;
    detail?: unknown;
  } | null;
  const reason = REPORT_REASONS.find((value) => value === body?.reason);
  const detail = typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  if (
    bundleId === undefined ||
    (commentParam !== undefined && commentId === undefined) ||
    !reason
  ) {
    return fail(400, 'COMMON_001');
  }
  const state = mockDb.get();
  const access = bundleAccess(state, bundleId);
  if ('error' in access) return access.error;
  const { viewer } = access;
  if (viewer === undefined) return fail(409, 'BUNCH_010');
  const bundle = state.bundles.find((item) => item.id === bundleId);
  if (commentId !== undefined) {
    const comment = visibleOf(state, viewer, bundleId).find((item) => item.id === commentId);
    if (!comment || comment.deleted) return fail(404, 'RESOURCE_001');
    // 내 댓글은 신고 메뉴가 없음(`canReport` false)
    if (comment.memberId === MOCK_MY_MEMBER_ID) return fail(403, 'AUTH_002');
  }
  const entry: MockReport = {
    id: nextId(state.reports),
    reporterBunchId: viewer,
    targetBunchId: bundle?.bunchId ?? 0,
    bundleId,
    ...(commentId === undefined ? {} : { commentId }),
    reason,
    detail,
  };
  mockDb.update((current) => ({ ...current, reports: [...current.reports, entry] }));
  return ok({ reportId: entry.id });
};

export const reportHandlers = [
  // POST /api/v1/bundles/{bundleId}/reports
  http.post('/api/bundles/:bundleId/reports', ({ params, request }) =>
    report(request, params.bundleId),
  ),
  // POST /api/v1/bundles/{bundleId}/comments/{commentId}/reports
  http.post('/api/bundles/:bundleId/comments/:commentId/reports', ({ params, request }) =>
    report(request, params.bundleId, params.commentId),
  ),
];

import { http } from 'msw';
import { toWireId } from '@/shared/api/client/ids';
import type { MockReport } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { nextId, REPORT_REASONS } from './blocks';
import { visibleOf } from './comments';
import { bundleAccess } from './likes';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 같은 번치·대상의 지금 24시간 구간 안 접수 수(명세 018·019): 구간은 첫 접수부터 고정 24시간
 * 두 번째 접수·거절은 구간을 늘리지 않고, 정확히 24시간부터 새 구간
 */
const reportsInWindow = (times: readonly number[], now: number) => {
  let start: number | undefined;
  for (const time of [...times].sort((a, b) => a - b)) {
    if (start === undefined || time >= start + DAY_MS) start = time;
  }
  if (start === undefined || now >= start + DAY_MS) return 0;
  return times.filter((time) => time >= start).length;
};

// 번들·댓글 신고(명세 018·019, Swagger `SocialContentReportRequest`). 볼 수 있는 번들만, 지금 번치 명의
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
  const now = Date.now();
  const sameTargetTimes = state.reports
    .filter(
      (item) =>
        item.reporterBunchId === viewer &&
        item.bundleId === bundleId &&
        item.commentId === commentId &&
        item.reportedAt !== undefined,
    )
    .map((item) => Date.parse(item.reportedAt ?? ''));
  // 같은 구간의 3번째는 접수하지 않음(구간은 그대로)
  if (reportsInWindow(sameTargetTimes, now) >= 2) return fail(409, 'BUNCH_011');
  const entry: MockReport = {
    id: nextId(state.reports),
    reporterBunchId: viewer,
    targetBunchId: bundle?.bunchId ?? 0,
    bundleId,
    ...(commentId === undefined ? {} : { commentId }),
    reason,
    detail,
    reportedAt: new Date(now).toISOString(),
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

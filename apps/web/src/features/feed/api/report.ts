import { bffApi, requestData } from '@/shared/api/bffApi';
import { toReportRequest } from '@/shared/lib/reportReasons';
import { reportResultSchema } from '../model/report';

export type ReportTarget = { bundleId: number; commentId?: number | undefined };

/** 지금 번치 명의로 번들(명세 018)이나 댓글(019) 신고. 사유는 화면 값(`shared/lib/reportReasons`) */
export const reportContent = (
  { bundleId, commentId }: ReportTarget,
  value: { reason: string; detail: string },
) =>
  requestData(
    bffApi.post(
      commentId === undefined
        ? `bundles/${bundleId}/reports`
        : `bundles/${bundleId}/comments/${commentId}/reports`,
      { json: toReportRequest(value) },
    ),
    reportResultSchema,
    commentId === undefined ? 'report bundle' : 'report comment',
  );

import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { requireWireId } from '@/shared/api/client/ids';
import { toReportRequest } from '@/shared/lib/reportReasons';
import { reportResultSchema } from '../model/report';

export type ReportTarget = { bundleId: string; commentId?: string | undefined };

/** 지금 번치 명의로 번들(명세 018)이나 댓글(019) 신고. 사유는 화면 값(`shared/lib/reportReasons`) */
export const reportContent = (
  { bundleId, commentId }: ReportTarget,
  value: { reason: string; detail: string },
) => {
  const bundle = requireWireId(bundleId, 'invalid bundle');
  return requestData(
    bffApi.post(
      commentId === undefined
        ? `bundles/${bundle}/reports`
        : `bundles/${bundle}/comments/${requireWireId(commentId, 'invalid comment')}/reports`,
      { json: toReportRequest(value) },
    ),
    reportResultSchema,
    commentId === undefined ? 'report bundle' : 'report comment',
  );
};

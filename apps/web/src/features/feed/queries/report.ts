import { useMutation } from '@tanstack/react-query';
import { reportContent, type ReportTarget } from '../api/report';

type ReportVariables = ReportTarget & { reason: string; detail: string };

/** 번들·댓글 신고(명세 018·019). 캐시는 바꾸지 않음(신고한 댓글 숨김은 화면 상태), 실패 안내는 화면 */
export const useReportMutation = () =>
  useMutation({
    mutationFn: ({ bundleId, commentId, ...value }: ReportVariables) =>
      reportContent({ bundleId, commentId }, value),
  });

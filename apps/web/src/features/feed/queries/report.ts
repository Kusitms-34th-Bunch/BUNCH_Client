import { useMutation } from '@tanstack/react-query';
import { reportContent, type ReportTarget } from '../api/report';

type ReportVariables = ReportTarget & { reason: string; detail: string };

/**
 * 번들·댓글 신고(명세 018·019). 실패 안내는 화면
 * 신고만으로는 아무것도 숨기지 않아 캐시를 바꾸지 않음(운영 검토 뒤 위반이면 삭제, 기능명세 2026-11-21 변경)
 */
export const useReportMutation = () =>
  useMutation({
    mutationFn: ({ bundleId, commentId, ...value }: ReportVariables) =>
      reportContent({ bundleId, commentId }, value),
  });

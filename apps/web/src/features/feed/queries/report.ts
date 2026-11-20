import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportContent, type ReportTarget } from '../api/report';
import { dropFromFeed } from './manageBundle';

type ReportVariables = ReportTarget & { reason: string; detail: string };

/**
 * 번들·댓글 신고(명세 018·019). 실패 안내는 화면
 * 번들 신고가 접수되면 받아 둔 피드에서 그 카드를 뺌(피드로 돌아갈 때 잠깐 보였다 사라지지 않게). 신고한 댓글 숨김은 화면 상태
 */
export const useReportMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, commentId, ...value }: ReportVariables) =>
      reportContent({ bundleId, commentId }, value),
    onSuccess: (_data, { bundleId, commentId }) => {
      if (commentId === undefined) dropFromFeed(queryClient, bundleId);
    },
  });
};

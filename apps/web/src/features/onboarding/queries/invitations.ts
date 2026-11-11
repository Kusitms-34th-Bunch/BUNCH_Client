import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { joinInvitation, verifyInvitation } from '../api/invitations';

/** 초대 확인. 참여하지 않으므로 cache를 바꾸지 않음. 실패 처리는 화면이 함(코드별 안내) */
export const useVerifyInvitationMutation = () =>
  useMutation({ mutationFn: (invitation: string) => verifyInvitation(invitation) });

/**
 * 초대 참여. 성공하면 소속·기본 번치가 바뀌므로 가입 상태(`sharedKeys.session()`)와 내 프로필(`sharedKeys.me()`)을 다시 읽음
 * 실패 처리는 화면이 함(코드별 안내)
 */
export const useJoinInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitation, idempotencyKey }: { invitation: string; idempotencyKey: string }) =>
      joinInvitation(invitation, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sharedKeys.session() });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
    },
  });
};

import { useMutation } from '@tanstack/react-query';
import { lookupInvitation } from '../api/invitation';

/** 초대 링크 유효성 확인. 서버 상태를 바꾸지 않아 cache는 건드리지 않고, 실패 처리는 화면이 함(코드별 안내) */
export const useLookupInvitationMutation = () =>
  useMutation({ mutationFn: (token: string) => lookupInvitation(token) });

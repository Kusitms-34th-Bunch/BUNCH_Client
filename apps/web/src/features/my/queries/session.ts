import { useMutation } from '@tanstack/react-query';
import { logout } from '../api/session';
import { MY_MESSAGES } from '../constants/messages';

/**
 * 로그아웃. 실패 토스트는 공통 처리(meta.errorMessage)
 * 성공 뒤 이동은 화면이 처리(문서를 다시 불러와 메모리의 사용자 데이터까지 비움)
 */
export const useLogoutMutation = () =>
  useMutation({ mutationFn: logout, meta: { errorMessage: MY_MESSAGES.logout.failed } });

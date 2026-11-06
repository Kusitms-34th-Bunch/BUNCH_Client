import { useMutation } from '@tanstack/react-query';
import { logout } from '../api/session';
import { MY_MESSAGES } from '../constants/messages';
import { MY_PATHS } from '../constants/paths';
import { reloadTo } from '../lib/navigation';

/**
 * 로그아웃. 실패 토스트는 공통 처리(meta.errorMessage)
 * 성공하면 로그인 화면을 새로 엶(메모리의 사용자 데이터까지 비움). 요청 중 화면이 사라져도 실행되도록 mutate가 아닌 여기서 처리
 */
export const useLogoutMutation = () =>
  useMutation({
    mutationFn: logout,
    meta: { errorMessage: MY_MESSAGES.logout.failed },
    onSuccess: () => reloadTo(MY_PATHS.login),
  });

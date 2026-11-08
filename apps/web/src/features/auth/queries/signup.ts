import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { logout } from '../api/logout';
import { saveTermsAgreements } from '../api/terms';
import { LOGIN_PATH } from '../constants/paths';
import { STATUS_CHECK_FAILURE_MESSAGE } from '../hooks/useSocialLogin';
import { reloadTo } from '../lib/reloadTo';

/**
 * 약관 동의 저장. 실패 토스트는 공통 처리(meta.errorMessage)
 * 성공하면 가입 상태(`sharedKeys.session()`)를 다시 읽고 기다림: 가드가 옛 상태(약관 미동의)로 프로필 이동을 되돌리지 않게 함
 */
export const useAgreeToTermsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveTermsAgreements,
    meta: { errorMessage: STATUS_CHECK_FAILURE_MESSAGE },
    // 다시 읽기에 실패하면 mutation도 실패로 처리(성공으로 두면 옛 상태로 프로필 이동이 가드에 되돌려짐, 같은 버전 재저장은 서버가 중복 이력을 만들지 않음)
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sharedKeys.session() }, { throwOnError: true }),
  });
};

/**
 * 가입을 멈추고 로그인 화면으로(약관 뒤로가기, 기획 1.3.5): 로그아웃 뒤 문서를 새로 불러와 로그인 상태를 해제
 * 가입 중 계정과 진행 상태는 서버에 남아 같은 소셜 계정으로 다시 로그인하면 이어짐. 실패 토스트는 공통 처리
 */
export const useLeaveSignupMutation = () =>
  useMutation({
    mutationFn: logout,
    meta: { errorMessage: STATUS_CHECK_FAILURE_MESSAGE },
    onSuccess: () => reloadTo(LOGIN_PATH),
  });

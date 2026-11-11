import { isApiError } from '@app/api-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { clearPersistedQueryStorage } from '@/shared/query/persistence';
import { logout } from '../api/logout';
import { registerMember } from '../api/registration';
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
      queryClient.invalidateQueries(
        // 구독하는 곳이 없어도 다시 읽도록 `all`(가드가 이 화면에서 빠지는 구조가 돼도 기다림이 유지됨)
        { queryKey: sharedKeys.session(), refetchType: 'all' },
        { throwOnError: true },
      ),
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
    // 로그아웃·탈퇴와 같이 이 기기의 사용자 데이터 저장본을 지운 뒤 새로 엶
    onSuccess: () => {
      clearPersistedQueryStorage();
      reloadTo(LOGIN_PATH);
    },
  });

/**
 * 가입 완료(프로필 저장). 실패 처리는 화면이 함(닉네임 중복은 입력란 아래 문구, 그 밖은 토스트)
 * 성공하면 가입 상태(`sharedKeys.session()`)를 다시 읽고 기다린 뒤 이동하게 함: 가드가 옛 상태(가입 중)로 이동을 되돌리지 않도록
 * 다시 읽기에 실패하면 실패로 처리(같은 프로필의 재시도는 서버가 기존 결과를 돌려줌)
 * 이동은 하지 않음: 가입 완료 사용자의 도착 화면은 가드(`AuthGate`)가 정함
 */
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerMember,
    onSuccess: () =>
      queryClient.invalidateQueries(
        // 구독하는 곳이 없어도 다시 읽도록 `all`(가드가 이 화면에서 빠지는 구조가 돼도 기다림이 유지됨)
        { queryKey: sharedKeys.session(), refetchType: 'all' },
        { throwOnError: true },
      ),
    // 이미 가입을 마친 계정(USER_003)이거나 약관 버전이 바뀐 경우(AUTH_016)는 서버 상태가 달라졌으므로 다시 읽어 가드가 알맞은 화면으로 보냄
    onError: (error) => {
      if (isApiError(error) && (error.code === 'USER_003' || error.code === 'AUTH_016')) {
        void queryClient.invalidateQueries({ queryKey: sharedKeys.session() });
      }
    },
  });
};

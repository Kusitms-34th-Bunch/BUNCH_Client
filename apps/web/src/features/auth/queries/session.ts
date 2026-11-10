import { isApiError } from '@app/api-core';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { DEFAULT_STALE_TIME } from '@/shared/query/queryClient';
import { getOnboarding } from '../api/onboarding';
import { type PostLoginDestinations, resolvePostLoginPath } from '../lib/postLoginPath';

/**
 * 로그인·가입 상태(서버의 `GET /members/me/onboarding`). 접근 제어(`AuthGate`)와 로그인 뒤 이동이 같은 값을 씀. 비로그인(401)은 `null`
 * 401을 오류가 아닌 데이터로 두는 이유: 데이터가 없는 query는 다시 읽을 때(탭 복귀 등) 오류를 지우고 로딩으로 돌아가 비로그인 화면이 로딩으로 바뀌었다가 처음부터 다시 그려짐
 * 상태가 바뀌는 동작(로그인·약관 저장·가입 완료)은 끝난 뒤 이 key를 무효화하고 기다린 뒤 이동해야 가드가 옛 상태로 막지 않음
 */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: sharedKeys.session(),
    queryFn: async ({ signal }) => {
      try {
        return await getOnboarding(signal);
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    // 비로그인은 바로 낡은 값으로 둬 탭 복귀 때 다른 탭의 로그인을 곧바로 반영(다시 읽어도 로딩으로 바뀌지 않음)
    staleTime: ({ state }) => (state.data === null ? 0 : DEFAULT_STALE_TIME),
  });

/** 로그인 직후 이동 방법. 가입 완료 사용자는 로그인 화면이 기록에 남지 않게 `replace`, 가입 중은 약관의 뒤로가기가 로그인으로 돌아오도록 `push` */
export type PostLoginNavigation = { path: string; replace: boolean };

/**
 * 로그인 직후 도착 화면을 정하는 함수. 서버의 가입 상태를 새로 읽어 세션 캐시에 채움
 * 그래서 도착한 화면의 `AuthGate`가 이전 계정이나 로그인 전 상태가 아닌 방금 읽은 상태로 판단함
 * 가드가 같은 key를 보고 있으므로 `fetchQuery`를 쓰지 않음(데이터 없는 key를 다시 읽으면 가드가 로딩으로 바뀌어 로그인 화면이 사라짐). 읽지 못하면 던짐
 */
export function usePostLoginPath(destinations: PostLoginDestinations) {
  const queryClient = useQueryClient();
  return async (): Promise<PostLoginNavigation> => {
    const onboarding = await getOnboarding();
    queryClient.setQueryData(sharedKeys.session(), onboarding);
    return {
      path: resolvePostLoginPath(onboarding, destinations),
      replace: onboarding.signupStatus === 'COMPLETED',
    };
  };
}

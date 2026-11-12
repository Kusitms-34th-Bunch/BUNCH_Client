import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * 지금 화면이 쓰는(구독 중인) 서버 상태를 모두 다시 받는 동작. 당겨서 새로고침(`PageShell`의 `onRefresh`)에 넘김
 * 화면에 API가 더해져도 그 query가 이 화면에서 쓰이는 한 따로 연결하지 않아도 같이 새로고침됨
 * 하나라도 실패하면 거부해 새로고침 실패로 알림(각 query의 오류 표시는 쓰는 화면이 이미 맡음)
 */
export function useRefreshActiveQueries() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.refetchQueries({ type: 'active' }, { throwOnError: true }),
    [queryClient],
  );
}

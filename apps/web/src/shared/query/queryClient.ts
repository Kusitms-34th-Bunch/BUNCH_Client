import { createRetryPolicy, normalizeError } from '@app/api-core';
import { QueryClient } from '@tanstack/react-query';

const { shouldRetryQuery } = createRetryPolicy();

/**
 * 앱 공용 QueryClient. 조회는 네트워크 오류·5xx만 1회 재시도(createRetryPolicy), 4xx·mutation은 재시도 없음
 * 401 재발급 뒤 재시도는 browserClient가 별도로 처리
 * 기본 staleTime 5분: 5분 안에 돌아오면 다시 요청하지 않고, 지난 뒤 화면 진입·앱 복귀(포커스) 때 갱신
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: (failureCount, error) => shouldRetryQuery(failureCount, normalizeError(error)),
      },
      mutations: { retry: false },
    },
  });

import { createRetryPolicy, normalizeError } from '@app/api-core';
import { QueryClient } from '@tanstack/react-query';

const { shouldRetryQuery } = createRetryPolicy();

/**
 * 앱 공용 QueryClient. 조회는 네트워크 오류·5xx만 1회 재시도(createRetryPolicy), 4xx·mutation은 재시도 없음
 * 401 재발급 뒤 재시도는 browserClient가 별도로 처리
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => shouldRetryQuery(failureCount, normalizeError(error)),
      },
      mutations: { retry: false },
    },
  });

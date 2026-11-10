import { createRetryPolicy, normalizeError } from '@app/api-core';
import { toast } from '@app/design-system';
import { MutationCache, QueryClient } from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  // 모듈 보강이라 사용처가 없음(TanStack Query가 meta 타입으로 읽음)
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface Register {
    mutationMeta: {
      /** 실패하면 띄울 토스트 문구. 없으면 공통 알림 없이 화면이 직접 처리 */
      errorMessage?: string;
    };
  }
}

const { shouldRetryQuery } = createRetryPolicy();

/** 조회 기본 staleTime(5분) */
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * 앱 공용 QueryClient. 조회는 네트워크 오류·5xx만 1회 재시도(createRetryPolicy), 4xx·mutation은 재시도 없음
 * 401 재발급 뒤 재시도는 browserClient가 별도로 처리
 * 기본 staleTime 5분: 5분 안에 돌아오면 다시 요청하지 않고, 지난 뒤 화면 진입·앱 복귀(포커스) 때 갱신
 * mutation 실패는 `meta.errorMessage`가 있을 때만 토스트(서버 `error.message`는 문구 키라 보여 주지 않음)
 */
export const createQueryClient = () =>
  new QueryClient({
    mutationCache: new MutationCache({
      onError: (_error, _variables, _context, mutation) => {
        const message = mutation.meta?.errorMessage;
        if (message) toast(message);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        retry: (failureCount, error) => shouldRetryQuery(failureCount, normalizeError(error)),
      },
      mutations: { retry: false },
    },
  });

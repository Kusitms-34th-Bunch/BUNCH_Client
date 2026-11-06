import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from './queryClient';

/** 테스트용 QueryClient: 앱과 같은 설정에서 재시도만 끔(오류 응답을 바로 확인) */
export const createTestQueryClient = () => {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, retry: false },
    mutations: { retry: false },
  });
  return client;
};

/** `render`·`renderHook`의 wrapper. 같은 client로 캐시를 확인하려면 직접 넘김 */
export const createQueryWrapper = (client: QueryClient = createTestQueryClient()) =>
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

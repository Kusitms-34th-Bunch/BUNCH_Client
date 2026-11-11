'use client';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useState } from 'react';
import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
  queryPersister,
  shouldPersistQuery,
} from '@/shared/query/persistence';
import { createQueryClient } from '@/shared/query/queryClient';

/**
 * 컴포넌트 인스턴스마다 QueryClient 생성(서버 렌더 요청 사이 캐시 공유 방지), 브라우저에서는 마운트 동안 유지
 * 저장해 둔 query를 복원하는 동안은 query가 요청을 미루고 로딩으로 보임(복원 뒤 오래된 데이터는 다시 받음)
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        // 일시 중지된 mutation(오프라인 중 댓글 등 입력값)은 저장하지 않음
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

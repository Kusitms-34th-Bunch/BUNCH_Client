'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createQueryClient } from '@/shared/query/queryClient';

/** 컴포넌트 인스턴스마다 QueryClient 생성(서버 렌더 요청 사이 캐시 공유 방지), 브라우저에서는 마운트 동안 유지 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

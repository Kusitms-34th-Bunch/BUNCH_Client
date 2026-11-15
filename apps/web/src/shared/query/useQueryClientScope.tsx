import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback } from 'react';

/** overlay root가 Query provider 밖에 그려질 때(테스트의 별도 root 등)도 조각이 이 화면의 client를 읽게 감쌈 */
export function useQueryClientScope() {
  const client = useQueryClient();
  return useCallback(
    (node: ReactNode) => <QueryClientProvider client={client}>{node}</QueryClientProvider>,
    [client],
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { sharedKeys } from '@/shared/query/keys';
import { editPublishedBundle, type PublishedEditInput } from '../api/bundles';
import { bundleQueryOptions } from './bundles';
import { bundleKeys } from './keys';

/**
 * 수정 화면이 보는 발행 번들 상세: 화면을 열 때마다 최신을 받고, 그 뒤에는 편집 중에 바뀌지 않게 다시 받지 않음
 * (수정 화면은 연 순간의 revision을 기준으로 저장하고, 편집 중 서버 값이 바뀌어 입력이 덮이는 일을 막음)
 */
export const bundleEditQueryOptions = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) => ({
  ...bundleQueryOptions(bunchId, bundleId),
  staleTime: Infinity,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

/**
 * 발행 번들 수정 저장(한 번에 보냄). 성공하면 받은 최신 상세를 캐시에 넣고 번치 홈의 발행 목록·개수를 다시 받음
 * 피드·번들 상세 캐시는 이 feature 밖(feed)이라 호출하는 화면(route)이 `onSaved`로 맞춤
 */
export const useEditPublishedBundleMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, ...input }: PublishedEditInput & { bundleId: string }) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return editPublishedBundle(bunchId, bundleId, input, createIdempotencyKey());
    },
    onSuccess: (bundle) => {
      queryClient.setQueryData(bundleKeys.detail(bundle.bunchId, bundle.id), bundle);
      void queryClient.invalidateQueries({
        queryKey: sharedKeys.bunchHomeScope(bundle.bunchId),
        refetchType: 'all',
      });
    },
  });
};

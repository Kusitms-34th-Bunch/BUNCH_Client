import { infiniteQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { sharedKeys } from '@/shared/query/keys';
import { getPinnedPlaces, removePinnedPlace } from '../api/pinnedPlaces';
import { PLACES_MESSAGES } from '../constants/messages';
import { ALL_MEMBERS } from '../lib/types';
import { bunchPlacesKeys } from './keys';

/** 지금 번치(`bunchId`)의 콕한 장소를 쪽 단위로. `memberId`는 칩(「전체」는 `ALL_MEMBERS`) */
export const pinnedPlacesQueryOptions = (bunchId: string, memberId: string) =>
  infiniteQueryOptions({
    queryKey: bunchPlacesKeys.list(bunchId, memberId),
    queryFn: async ({ client, pageParam, signal }) => {
      const page = await getPinnedPlaces(memberId, pageParam, signal);
      // 서버가 지금 번치를 세션으로 고르므로, 받는 사이 번치가 바뀌었으면(첫 쪽 포함) 다른 번치 카드를 넣지 않음
      // 실패로 두고 내 정보를 다시 받아 key가 새 번치로 옮겨가게 함(다른 기기에서 번치를 바꾼 경우)
      if (page.bunchId !== bunchId) {
        void client.invalidateQueries({ queryKey: sharedKeys.me() });
        throw new Error(`pinned places bunch changed: ${page.bunchId}`);
      }
      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/** 번치 홈을 그린 뒤 「콕한 장소」 첫 화면(「전체」 칩)을 미리 받음. 실패는 화면에 들어가면 다시 받음 */
export const usePrefetchPinnedPlaces = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (bunchId: string) =>
      void queryClient.prefetchInfiniteQuery({
        ...pinnedPlacesQueryOptions(bunchId, ALL_MEMBERS),
        // 미리 받은 목록을 다시 미리 받지 않는 시간(번치 홈 하위 목록과 같은 값)
        staleTime: 30_000,
      }),
    [queryClient],
  );
};

/** 콕에서 빼기. 성공·실패 모두 칩 숫자와 목록을 다시 받음(실패하면 빼기 전 카드가 돌아옴) */
// 보지 않는 칩 목록도 함께 다시 받아 칩을 옮겼을 때 뺀 카드가 잠깐 보이지 않게 함(칩 수만큼, 멤버 최대 8명)
export const useRemovePinnedPlaceMutation = (bunchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removePinnedPlace,
    meta: { errorMessage: PLACES_MESSAGES.error },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: bunchPlacesKeys.lists(bunchId),
        refetchType: 'all',
      }),
  });
};

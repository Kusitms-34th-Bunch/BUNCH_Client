import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPinnedPlaces, removePinnedPlace } from '../api/pinnedPlaces';
import { PLACES_MESSAGES } from '../constants/messages';
import { bunchPlacesKeys } from './keys';

/** 지금 번치(`bunchId`)의 콕한 장소. `memberId`는 칩(「전체」는 `ALL_MEMBERS`) */
export const pinnedPlacesQueryOptions = (bunchId: string, memberId: string) =>
  queryOptions({
    queryKey: bunchPlacesKeys.list(bunchId, memberId),
    queryFn: ({ signal }) => getPinnedPlaces(memberId, signal),
  });

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

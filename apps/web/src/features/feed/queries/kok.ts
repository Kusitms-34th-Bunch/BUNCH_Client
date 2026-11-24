import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import {
  type QueryClient,
  queryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { isWireId, toDomainId } from '@/shared/api/client/ids';
import type { BundleKoks } from '../model/kok';
import { getBundleKoks, pinPlace, unpinPlace } from '../api/kok';
import { FEED_MESSAGES } from '../constants/messages';
import { feedKeys } from './keys';

/** 번들 장소별 콕 여부. 명의를 알기 전(undefined)이나 잘못된 번들 ID면 요청하지 않음 */
export const bundleKoksQueryOptions = (bundleId: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: feedKeys.koks(bundleId, viewerId ?? null),
    queryFn:
      viewerId === undefined || !isWireId(bundleId)
        ? skipToken
        : ({ signal }) => getBundleKoks(bundleId, signal),
  });

/**
 * 시트를 열기 전에 콕 여부를 받음(받아 둔 값이 새것이면 요청 없이). 받는 중·실패 상태를 시트에 두지 않으려고
 * 다시 받기가 실패해도 받아 둔 값이 있으면 그 값으로 엶. 소속 번치가 없으면 받지 않음(모두 「콕하기」)
 */
export const useLoadBundleKoks = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (bundleId: string, viewerId: string | null) => {
      if (viewerId === null) return;
      const options = bundleKoksQueryOptions(bundleId, viewerId);
      try {
        await queryClient.fetchQuery(options);
      } catch (error) {
        if (queryClient.getQueryData(options.queryKey) === undefined) throw error;
      }
    },
    [queryClient],
  );
};

export type KokVariables = {
  bundleId: string;
  viewerId: string | null;
  locationId: string;
} & ({ pin: true } | { pin: false; pinId: number });

// 번들·광고 장소 콕이 함께 씀(같은 장소를 양쪽에서 누를 수 있어 하나씩 차례로 보내고 대기 수도 함께 셈)
export const KOK_KEY = ['bundle-kok'] as const;
export const KOK_SCOPE = { id: 'bundle-kok' };

/** 같은 명의의 마지막 콕 요청이 끝났을 때만 그 명의의 콕 여부를 다시 받음(뒤 요청이 남았으면 방금 누른 버튼을 덮지 않게) */
export const refreshKoksWhenIdle = (queryClient: QueryClient, viewerId: string | null) => {
  const pendingForViewer = queryClient.isMutating({
    mutationKey: KOK_KEY,
    predicate: (mutation) =>
      (mutation.state.variables as { viewerId?: string | null } | undefined)?.viewerId === viewerId,
  });
  if (pendingForViewer > 1) return;
  return queryClient.invalidateQueries({ queryKey: feedKeys.koksOf(viewerId) });
};

/** 받아 둔 콕 여부에서 그 장소(화면 id) */
export const findKok = (data: BundleKoks | undefined, locationId: string) =>
  data?.locations.find((location) => toDomainId(location.id) === locationId);

const patch = (
  data: BundleKoks | undefined,
  locationId: string,
  next: Partial<BundleKoks['locations'][number]>,
) =>
  data && {
    ...data,
    locations: data.locations.map((location) =>
      toDomainId(location.id) === locationId ? { ...location, ...next } : location,
    ),
  };

/** 다른 멤버가 그사이 뺀 콕을 취소함(그 상태로 맞추고 알리지 않음, 기능명세서 6.3.1) */
export const isAlreadyUnpinned = (error: unknown, vars: { pin: boolean }) =>
  !vars.pin && isApiError(error) && error.code === 'RESOURCE_001';

/**
 * 장소 콕하기·콕 취소(명세 010·009). 누르면 시트 버튼이 바로 바뀌고, 실패하면 그 장소만 되돌리고 헤더 아래에 알림
 * (다른 멤버가 이미 뺀 콕의 취소는 뺀 상태로 맞추고 알리지 않음). 화면을 떠난 뒤 실패해도 알리도록 여기서 띄움
 * 요청은 하나씩 차례로 보내 취소·콕을 연달아 눌러도 서버에 마지막 값이 남음
 * ponytail: 연달아 누르면 뒤 요청의 되돌림 기준이 앞 요청의 미리 바꾼 값이라 앞 요청이 실패하면 잠깐 어긋남, 마지막 요청 뒤 다시 받기로 맞춤
 * 마지막 요청이 끝나면 같은 명의의 콕 여부를 모두 다시 받음(같은 장소가 담긴 다른 번들·같은 번들의 다른 위치)
 */
export const useKokMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: KOK_KEY,
    scope: KOK_SCOPE,
    // 성공하면 그 장소의 콕 ID(취소면 null)
    mutationFn: async (vars: KokVariables): Promise<number | null> => {
      if (!isWireId(vars.bundleId) || !isWireId(vars.locationId)) throw new Error('invalid place');
      if (vars.pin) return (await pinPlace(vars.bundleId, vars.locationId)).id;
      await unpinPlace(vars.pinId);
      return null;
    },
    onMutate: async (vars) => {
      const key = feedKeys.koks(vars.bundleId, vars.viewerId);
      const { locationId } = vars;
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = findKok(queryClient.getQueryData<BundleKoks>(key), locationId);
      // 취소는 콕 ID도 비움(응답 전에 다시 콕해도 옛 ID로 다시 취소하지 못하게, 새 ID는 콕 응답이 채움)
      queryClient.setQueryData<BundleKoks>(key, (data) =>
        patch(data, locationId, vars.pin ? { pinned: true } : { pinned: false, pinId: null }),
      );
      return { previous, locationId };
    },
    onError: (error, vars, context) => {
      if (!isAlreadyUnpinned(error, vars)) {
        toast(FEED_MESSAGES.actionFailed, { position: 'top' });
      }
      if (!context) return;
      const next = isAlreadyUnpinned(error, vars)
        ? { pinned: false, pinId: null }
        : context.previous && { pinned: context.previous.pinned, pinId: context.previous.pinId };
      if (!next) return;
      queryClient.setQueryData<BundleKoks>(feedKeys.koks(vars.bundleId, vars.viewerId), (data) =>
        patch(data, context.locationId, next),
      );
    },
    onSuccess: (pinId, vars, context) => {
      queryClient.setQueryData<BundleKoks>(feedKeys.koks(vars.bundleId, vars.viewerId), (data) =>
        patch(data, context.locationId, { pinId }),
      );
    },
    onSettled: (_data, _error, vars) => refreshKoksWhenIdle(queryClient, vars.viewerId),
  });
};

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BundleDetail, DetailLocation } from '../model/bundle';
import { bundleKeys } from './keys';

/**
 * 번들 상세 캐시의 장소 목록을 읽고 쓰는 도구(장소 작업 응답을 상세에 바로 반영)
 * 저장 응답의 revision은 상세 revision과 맞추지 않음(올리면 아직 못 받은 다른 멤버의 이벤트를 놓칠 수 있음)
 */
export const useLocationCache = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMemo(() => {
    const queryKey = bundleKeys.detail(bunchId, bundleId);
    return {
      /** 지금 캐시의 번들 상세(앞선 변경이 끝난 서버 목록을 읽을 때 씀) */
      readDetail: () => queryClient.getQueryData<BundleDetail>(queryKey),
      /**
       * 작업 응답의 목록을 반영. 캐시의 장소 버전보다 낮은 응답은 늦게 도착한 것이라 반영하지 않음
       * 같은 버전이면 같은 목록이라 그대로 덮어써도 결과가 같음
       */
      writeLocations: (locations: readonly DetailLocation[], locationVersion: number) => {
        queryClient.setQueryData<BundleDetail>(queryKey, (old) =>
          old && locationVersion >= old.locationVersion
            ? { ...old, locations, locationVersion }
            : old,
        );
      },
      /** 진행 중인 재조회는 취소하지 않고 그 결과를 함께 받음 */
      refetch: () => queryClient.refetchQueries({ queryKey }, { cancelRefetch: false }),
    };
  }, [queryClient, bunchId, bundleId]);
};

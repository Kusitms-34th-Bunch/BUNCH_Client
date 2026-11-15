import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BundleDetail, PhotoPicks } from '../model/bundle';
import { bundleKeys } from './keys';

/**
 * 번들 상세 캐시의 사진별 픽을 읽고 쓰는 도구(픽 저장 응답을 상세에 바로 반영)
 * 저장 응답에는 revision이 없어 상세의 revision은 건드리지 않음(올리면 아직 못 받은 다른 멤버의 이벤트를 놓칠 수 있음)
 */
export const usePhotoPickCache = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMemo(() => {
    const queryKey = bundleKeys.detail(bunchId, bundleId);
    return {
      /** 지금 캐시의 번들 사진(없으면 번들에서 빠진 사진) */
      readPhoto: (photoId: string) =>
        queryClient
          .getQueryData<BundleDetail>(queryKey)
          ?.photos.find((photo) => photo.id === photoId),
      writePicks: (photoId: string, picks: PhotoPicks) => {
        queryClient.setQueryData<BundleDetail>(queryKey, (old) =>
          old
            ? {
                ...old,
                photos: old.photos.map((photo) =>
                  photo.id === photoId ? { ...photo, picks } : photo,
                ),
              }
            : old,
        );
      },
      /** 진행 중인 재조회는 취소하지 않고 그 결과를 함께 받음 */
      refetch: () => queryClient.refetchQueries({ queryKey }, { cancelRefetch: false }),
    };
  }, [queryClient, bunchId, bundleId]);
};

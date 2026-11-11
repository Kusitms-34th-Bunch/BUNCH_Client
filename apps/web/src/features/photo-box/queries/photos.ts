import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { changePhotoDates, removePhotos } from '../api/photos';
import { MissingPhotosError } from '../lib/missingPhotos';
import { photoBoxKeys } from './keys';

// 고른 사진이 그사이 지워져 거절됐으면(`MissingPhotosError`) 사라진 사진이 목록에서 빠지도록 목록을 다시 받음
// 반환해서 mutateAsync가 거절되기 전에 재조회가 끝나게 함(성공 경로와 같은 타이밍이라 옛 목록이 잠깐 보이지 않음)
const invalidateIfMissing = (
  queryClient: ReturnType<typeof useQueryClient>,
  bunchId: string | undefined,
  error: unknown,
) =>
  error instanceof MissingPhotosError
    ? queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) })
    : undefined;

/**
 * 고른 사진 삭제. 성공하면 그 번치의 사진 목록 전체를 무효화(목록 구성·개수가 바뀜)
 * 번치를 아직 모르면(undefined) 호출은 실패, 화면은 번치가 정해진 뒤에만 부름
 * 고른 사진이 그사이 지워져 거절되면(`MissingPhotosError`) 목록에서 그 사진이 빠지도록 목록도 다시 받음
 * 성공·실패 토스트와 선택 해제는 화면이 결과에 따라 직접 처리(사라진 사진은 일반 실패 토스트와 문구가 달라 공통 토스트를 쓰지 않음)
 */
export const useDeletePhotosMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: readonly string[]) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return removePhotos(bunchId, photoIds);
    },
    // 반환해서 mutateAsync·isPending이 활성 목록 재요청 완료까지 대기
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
    onError: (error) => invalidateIfMissing(queryClient, bunchId, error),
  });
};

/**
 * 고른 사진의 촬영 날짜 바꾸기. 성공하면 그 번치의 사진 목록을 다시 받아 날짜 섹션을 서버 기준으로 맞춤
 * 사라진 사진으로 거절되면(`MissingPhotosError`) 목록도 다시 받고, 토스트는 화면이 결과에 따라 직접 처리
 */
export const useChangePhotoDatesMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoIds, date }: { photoIds: readonly string[]; date: Date }) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return changePhotoDates(bunchId, photoIds, date);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
    onError: (error) => invalidateIfMissing(queryClient, bunchId, error),
  });
};

/** 그 번치의 사진 목록·상세 캐시를 모두 무효화(다른 사람이 지운 사진을 발견했을 때 목록을 새로 받음) */
export const useInvalidatePhotos = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  // 효과의 의존성으로 쓰이므로 번치가 같으면 같은 함수를 돌려줌
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
    [queryClient, bunchId],
  );
};

/**
 * 번치를 호출할 때 정해 그 번치의 사진 목록·상세 캐시를 무효화하는 함수(업로드가 끝났을 때)
 * 올리는 중에 사진함의 번치가 바뀌어도 처음 정한 번치의 목록을 새로 받도록 번치를 인자로 받음
 */
export const useInvalidatePhotosOf = () => {
  const queryClient = useQueryClient();
  return useCallback(
    (bunchId: string) => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
    [queryClient],
  );
};

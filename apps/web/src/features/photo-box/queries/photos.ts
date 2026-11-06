import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { removePhotos } from '../api/photos';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxKeys } from './keys';

/**
 * 고른 사진 삭제. 성공하면 그 번치의 사진 목록 전체를 무효화(목록 구성·개수가 바뀜)
 * 번치를 아직 모르면(undefined) 호출은 실패, 화면은 번치가 정해진 뒤에만 부름
 * 실패 토스트는 공통 처리(meta.errorMessage), 성공 토스트·선택 해제는 화면이 `mutate(…, { onSuccess })`로 처리
 */
export const useDeletePhotosMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: readonly string[]) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return removePhotos(bunchId, photoIds);
    },
    meta: { errorMessage: PHOTO_BOX_MESSAGES.deleteFailed },
    // 반환해서 mutateAsync·isPending이 활성 목록 재요청 완료까지 대기
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
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

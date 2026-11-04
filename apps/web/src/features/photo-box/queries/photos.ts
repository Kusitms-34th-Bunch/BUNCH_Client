import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removePhotos } from '../api/photos';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxKeys } from './keys';

/**
 * 고른 사진 삭제. 성공하면 그 번치의 사진 목록 전체를 무효화(목록 구성·개수가 바뀜)
 * 실패 토스트는 공통 처리(meta.errorMessage), 성공 토스트·선택 해제는 화면이 `mutate(…, { onSuccess })`로 처리
 */
export const useDeletePhotosMutation = (bunchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: readonly string[]) => removePhotos(bunchId, photoIds),
    meta: { errorMessage: PHOTO_BOX_MESSAGES.deleteFailed },
    // 반환해서 mutateAsync·isPending이 활성 목록 재요청 완료까지 대기
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
  });
};

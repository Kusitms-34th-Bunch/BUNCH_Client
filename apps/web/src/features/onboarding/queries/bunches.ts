import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import {
  createBunch,
  issueBunchInvitation,
  resetBunchProfileImage,
  updateBunchProfileImage,
  type CreateBunchInput,
} from '../api/bunches';

/**
 * 번치 생성. 성공하면 가입 상태(`sharedKeys.session()`)를 다시 읽음: 소속 번치가 생겨 기본 번치가 바뀌므로
 * 실패 처리는 화면이 함(이름 중복·소속 한도는 코드별 안내)
 */
export const useCreateBunchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateBunchInput; idempotencyKey: string }) =>
      createBunch(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sharedKeys.session() });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
      // 번치 전환 목록과 소속 개수 한도에 새 번치를 반영
      void queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() });
    },
  });
};

/** 번치 대표 사진 변경(사진 `string`) 또는 기본 이미지 적용(`undefined`) */
export const useChangeBunchPhotoMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: string | undefined) => {
      if (bunchId === undefined) throw new Error('번치를 아직 만들지 않았습니다.');
      return photo === undefined
        ? resetBunchProfileImage(bunchId)
        : updateBunchProfileImage(bunchId, photo);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope(bunchId) });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
    },
  });
};

export const onboardingKeys = {
  // 응답을 바꾸는 입력은 번치 하나뿐
  invitation: (bunchId: string | undefined) => ['bunch-invitation', bunchId] as const,
};

/**
 * 번치의 유효한 초대 링크. 서버가 있으면 기존 링크를, 없거나 만료됐으면 새로 발급해 돌려줌(POST지만 같은 링크라 다시 불러와도 안전)
 * 번치를 모르면 요청하지 않음. 실패하면 화면의 「다시 불러오기」로 `refetch`
 */
export const useBunchInvitationQuery = (bunchId: string | undefined) =>
  useQuery({
    queryKey: onboardingKeys.invitation(bunchId),
    queryFn: ({ signal }) => issueBunchInvitation(bunchId ?? '', signal),
    enabled: bunchId !== undefined,
    // 링크는 7일 유효하고 같은 링크를 돌려주므로 포커스 복귀·재연결로 다시 받지 않음
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
  });

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bunchInvitationQueryOptions } from '@/shared/query/bunchInvitation';
import { sharedKeys } from '@/shared/query/keys';
import {
  createBunch,
  resetBunchProfileImage,
  updateBunchProfileImage,
  type CreateBunchInput,
  validateBunchIntroduction,
} from '../api/bunches';
import { ONBOARDING_MESSAGES } from '../constants/messages';

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

/** 번치 만들기 2단계 한 줄 소개 사전 검사(저장하지 않아 다시 읽을 값 없음). 실패 처리는 화면이 함(금칙어는 입력란 아래 안내) */
export const useValidateIntroductionMutation = () =>
  useMutation({ mutationFn: validateBunchIntroduction });

/**
 * 번치 대표 사진 변경(사진 `string`) 또는 기본 이미지 적용(`undefined`)
 * 올리는 중 화면을 떠나도 끝나면 번치 홈을 다시 받고, 실패 안내도 화면과 관계없이 공통 토스트(기능명세 2.3.2 예외)
 */
export const useChangeBunchPhotoMutation = (
  bunchId: string | undefined,
  // 완료 화면의 만든 번치 갱신. 저장 중 화면을 떠나도 돌아왔을 때 새 사진이 보이게 여기서 부름
  onChanged?: (_bunch: Awaited<ReturnType<typeof updateBunchProfileImage>>) => void,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    // 같은 번치의 사진 변경은 화면을 다시 열어도 차례대로 보내 늦은 응답이 최신 사진을 덮지 않게 함
    ...(bunchId === undefined ? {} : { scope: { id: `bunch-photo:${bunchId}` } }),
    meta: { errorMessage: ONBOARDING_MESSAGES.temporaryFailure },
    mutationFn: (photo: string | undefined) => {
      if (bunchId === undefined) throw new Error('번치를 아직 만들지 않았습니다.');
      return photo === undefined
        ? resetBunchProfileImage(bunchId)
        : updateBunchProfileImage(bunchId, photo);
    },
    onSuccess: (bunch) => {
      onChanged?.(bunch);
      void queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope(bunchId) });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.me() });
    },
  });
};

/**
 * 번치의 유효한 초대 링크. 서버가 있으면 기존 링크를, 없거나 만료됐으면 새로 발급해 돌려줌(POST지만 같은 링크라 다시 불러와도 안전)
 * 번치를 모르면 요청하지 않음. 실패하면 화면의 「다시 불러오기」로 `refetch`
 */
export const useBunchInvitationQuery = (bunchId: string | undefined) =>
  useQuery(bunchInvitationQueryOptions(bunchId));

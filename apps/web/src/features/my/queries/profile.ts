'use client';

import { toast } from '@app/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { sharedKeys } from '@/shared/query/keys';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { updateMyProfile } from '../api/profile';
import { MY_MESSAGES } from '../constants/messages';
import { toMyProfile } from '../lib/profile';

/**
 * 내 프로필(`GET /members/me`). 화면에 들어올 때마다 다시 불러오고(기능명세서 7.1.1 로직 3) 받아 둔 값이 있으면 먼저 보임
 * 불러오기 실패는 기본으로 여기서 토스트로 알림. 이후 화면을 어떻게 할지는 호출하는 쪽이 정함
 * 실패 뒤 화면 이동이 따르는 호출은 이동 뒤에 토스트가 보이도록 `notifyFailure: false`로 끄고 직접 예약
 */
export function useMyProfile({ notifyFailure = true }: { notifyFailure?: boolean } = {}) {
  const query = useQuery({ ...myProfileQueryOptions(), refetchOnMount: 'always' });
  // 다른 화면이 남긴 오류 상태로 재조회 결과가 나오기 전에 토스트가 뜨지 않도록 요청이 끝난 뒤에만 실패로 봄
  const failed = query.isError && query.fetchStatus === 'idle';

  useEffect(() => {
    if (failed && notifyFailure) toast(MY_MESSAGES.profileLoadFailed);
  }, [failed, notifyFailure]);

  return {
    profile: query.data ? toMyProfile(query.data) : undefined,
    /** 아직 받은 값이 없고 첫 응답을 기다리는 중 */
    isPending: query.isPending,
    /** 요청이 끝난 뒤의 실패(재조회 중인 오류 상태는 제외) */
    isError: failed,
  };
}

/**
 * 내 프로필 저장. 실패 안내는 화면이 맡음(닉네임 중복은 입력란 오류, 그 밖은 토스트)
 * 성공하면 내 프로필을 다시 받은 뒤 끝냄(돌아간 마이페이지가 새 값을 바로 그림, 기능명세서 7.2.7 로직 3)
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
  });
};

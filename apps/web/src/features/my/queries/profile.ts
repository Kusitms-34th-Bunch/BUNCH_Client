'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { updateMyProfile } from '../api/profile';
import { toMyProfile } from '../lib/profile';

/**
 * 내 프로필(`GET /members/me`). 화면에 들어올 때마다 다시 불러오고(기능명세서 7.1.1 로직 3) 받아 둔 값이 있으면 먼저 보임
 * 실패 안내는 화면이 정함(마이페이지는 토스트, 프로필 수정은 이동 뒤 토스트)
 */
export function useMyProfile() {
  const query = useQuery({ ...myProfileQueryOptions(), refetchOnMount: 'always' });
  return {
    profile: query.data ? toMyProfile(query.data) : undefined,
    /** 아직 받은 값이 없고 첫 응답을 기다리는 중 */
    isPending: query.isPending,
    /** 요청이 끝난 뒤의 실패(다른 화면이 남긴 오류 상태로 재조회 결과 전에 실패로 보지 않음) */
    isError: query.isError && query.fetchStatus === 'idle',
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

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { updateMyProfile } from '../api/profile';
import { toMyProfile } from '../lib/profile';
import { myKeys } from './keys';

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
    /** 조회가 아직 끝나지 않음(받는 중이거나 오프라인이라 연결을 기다리는 중, 받아 둔 값이 있어도 참) */
    isFetching: query.fetchStatus !== 'idle',
    /** 마지막 조회가 실패한 상태(실패 뒤 다시 받는 중에도 참, 받아 둔 옛 값으로 바꾸지 못하게 막을 때 씀) */
    hasFailed: query.status === 'error',
  };
}

/**
 * 내 프로필 저장. 실패 안내는 화면이 맡음(닉네임 중복은 입력란 오류, 그 밖은 토스트)
 * 성공하면 내 프로필과 추가 개인정보를 다시 받은 뒤 끝냄(돌아간 마이페이지가 새 값을 바로 그림, 기능명세서 7.2.7 로직 3)
 * 실패하면 동의 상태를 다시 받음(다른 기기에서 철회해 서버가 거부했으면 출생연도·성별 영역을 숨김, 기능명세서 7.2.6 예외)
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    // 둘 다 받은 뒤 끝냄(추가 개인정보 재조회를 이동 뒤에 두면 화면이 사라질 때 취소돼 옛 값이 남고, 다시 들어오면 그 값이 채워짐)
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sharedKeys.me() }),
        queryClient.invalidateQueries({ queryKey: myKeys.additionalInfo() }),
      ]),
    // 재조회를 기다리지 않음(오류 안내와 다시 누르기가 늦어지지 않게)
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: myKeys.additionalInfo() });
    },
  });
};

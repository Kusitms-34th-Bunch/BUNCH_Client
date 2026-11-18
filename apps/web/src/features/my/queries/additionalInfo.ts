'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdditionalInfo, updateAdditionalInfoConsent } from '../api/additionalInfo';
import { MY_MESSAGES } from '../constants/messages';
import { myKeys } from './keys';

/**
 * 추가 개인정보 동의 상태와 저장된 출생연도·성별. 화면에 들어올 때마다 다시 받음(기능명세서 7.2.6 로직 4·7.4.4 로직 1)
 * 개인정보라 캐시 영속화하지 않음
 */
export const additionalInfoQueryOptions = () =>
  queryOptions({
    queryKey: myKeys.additionalInfo(),
    queryFn: ({ signal }) => getAdditionalInfo(signal),
    refetchOnMount: 'always',
  });

export function useAdditionalInfo() {
  const query = useQuery(additionalInfoQueryOptions());
  return {
    additionalInfo: query.data,
    isPending: query.isPending,
    /** 요청이 끝난 뒤의 실패(재조회 중에는 실패로 보지 않음) */
    isError: query.isError && query.fetchStatus === 'idle',
    /** 조회가 아직 끝나지 않음(받는 중이거나 오프라인이라 연결을 기다리는 중, 받아 둔 값이 있어도 참) */
    isFetching: query.fetchStatus !== 'idle',
    /** 마지막 조회가 실패한 상태(실패 뒤 다시 받는 중에도 참, 받아 둔 옛 값으로 바꾸지 못하게 막을 때 씀) */
    hasFailed: query.status === 'error',
  };
}

/**
 * 추가 개인정보 동의·철회 저장. 실패하면 오류 토스트(공통 처리 `meta.errorMessage`)를 띄우고 토글은 그대로(기능명세서 7.4.5 예외)
 * 성공하면 응답으로 동의 상태를 바로 바꿈(철회면 출생연도·성별도 비워져 옴)
 */
export const useUpdateAdditionalInfoConsentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdditionalInfoConsent,
    meta: { errorMessage: MY_MESSAGES.termsSettings.demographics.failed },
    onSuccess: async (saved) => {
      // 저장 전에 시작한 조회가 늦게 도착해 저장 결과를 덮지 않게 취소한 뒤 바꿈
      await queryClient.cancelQueries({ queryKey: myKeys.additionalInfo() });
      queryClient.setQueryData(myKeys.additionalInfo(), saved);
    },
  });
};

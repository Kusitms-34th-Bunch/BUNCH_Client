import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPushPreferences, updatePushPreferences } from '../api/notifications';
import { MY_MESSAGES } from '../constants/messages';
import {
  applyPreferencePatch,
  type PushPreferencePatch,
  type PushPreferences,
} from '../lib/notificationPreferences';
import { myKeys } from './keys';

/** 내 푸시 수신 설정 조회. 화면에 들어올 때마다 다시 받아 다른 기기에서 바꾼 값을 반영함(받아 둔 값이 있으면 먼저 보임, 기능명세서 7.3.1) */
export const notificationSettingsQueryOptions = () =>
  queryOptions({
    queryKey: myKeys.notificationSettings(),
    queryFn: ({ signal }) => getPushPreferences(signal),
    refetchOnMount: 'always',
  });

// 같은 scope의 요청은 TanStack Query가 순서대로 하나씩 보냄(연타해도 서버에 마지막 누른 값이 남음)
const MUTATION_SCOPE = { id: 'my-notification-settings' };

/**
 * 푸시 수신 설정 저장. 누르면 바로 화면을 바꾸고 서버에 저장함(기능명세서 7.3.2·7.3.3)
 * 실패하면 오류 토스트(공통 처리 `meta.errorMessage`)를 띄우고, 마지막 요청이 끝난 시점에 저장 전 값으로 되돌린 뒤 서버 값을 다시 받아 맞춤
 * 다른 요청이 아직 남아 있으면 되돌림·재조회·응답 반영을 모두 미뤄, 연타 중 앞선 요청의 결과가 뒤에 누른 값을 덮지 않음
 */
export const useUpdateNotificationSettingsMutation = () => {
  const queryClient = useQueryClient();
  const queryKey = myKeys.notificationSettings();

  return useMutation({
    mutationKey: queryKey,
    scope: MUTATION_SCOPE,
    mutationFn: (patch: PushPreferencePatch) => updatePushPreferences(patch),
    meta: { errorMessage: MY_MESSAGES.notifications.saveFailed },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PushPreferences>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, applyPreferencePatch(previous, patch));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      // 뒤에 누른 요청이 남아 있으면 그 요청이 끝날 때 맞추도록 건너뜀(지금 재조회하면 뒤 요청과 겹쳐 낡은 값이 덮을 수 있음)
      if (queryClient.isMutating({ mutationKey: queryKey }) > 1) return;
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      void queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: (saved) => {
      if (queryClient.isMutating({ mutationKey: queryKey }) <= 1) {
        queryClient.setQueryData(queryKey, saved);
      }
    },
  });
};

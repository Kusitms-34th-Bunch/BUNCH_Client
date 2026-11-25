import { queryOptions } from '@tanstack/react-query';
import { getUpdateRequired } from '../api/appVersion';
import { appUpdateKeys } from './keys';

// 앱으로 돌아올 때(창 포커스, 전역 기본값) 마지막 확인에서 30분이 지났으면 다시 물음
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 업데이트 필요 여부. 실패는 막지 않음(재시도 없이 다음 포커스에 다시 물음, 실패한 결과는 30분을 기다리지 않음)
 * 저장하지 않음(`persistedQuery` 없음): 업데이트한 앱이 이전 결과로 막히지 않게
 */
export const appUpdateRequiredQueryOptions = () =>
  queryOptions({
    queryKey: appUpdateKeys.required(),
    queryFn: ({ signal }) => getUpdateRequired(signal),
    staleTime: CHECK_INTERVAL_MS,
    retry: false,
  });

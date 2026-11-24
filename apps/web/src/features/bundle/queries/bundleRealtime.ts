import { useQueryClient } from '@tanstack/react-query';
import { type BundleEventOutcome, routeBundleEvent } from '../lib/bundleEvents';
import { type BundleDetail, bundleEventEnvelopeSchema } from '../model/bundle';
import { bundleKeys } from './keys';

/** 번들 상세를 최신으로 다시 받음(실시간 연결이 끊겼다 돌아왔을 때처럼 놓친 변경을 맞출 때). 받지 못하면 reject */
export const useRefetchBundleDetail = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.refetchQueries(
      { queryKey: bundleKeys.detail(bunchId, bundleId), exact: true },
      { throwOnError: true },
    );
};

/**
 * 번들 topic으로 온 이벤트를 상세 캐시에 반영(v5 실시간 명세 6절)
 * - 내용 이벤트(revision 있음): 이미 반영된 revision은 무시, 바로 다음이면 type별 data를 적용, 건너뛰었으면 놓친 이벤트가 있다는 뜻이라 최신 상세를 다시 받음(이벤트는 재생되지 않음)
 * - PERMISSIONS·DELETED·CREATED·PUBLISHED·EDITED: revision 검사 없이 항상 상세를 다시 받아 확인(발행·삭제·참여 제외 화면은 그 결과로 정해짐)
 * - DATE_CHIPS: 내용 revision을 올리지 않는 별도 갱신이라 revision 검사를 하지 않음. PRESENCE 등 그 밖의 type은 건드리지 않음
 * 같은 이벤트가 다시 와도 결과가 같음
 */
export const useApplyBundleEvent = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  const refetch = () => void queryClient.invalidateQueries({ queryKey: key });
  const settle = (outcome: BundleEventOutcome) => {
    if (outcome.kind === 'apply') queryClient.setQueryData<BundleDetail>(key, outcome.detail);
    else if (outcome.kind === 'refetch') refetch();
  };
  return (body: unknown) => {
    const envelope = bundleEventEnvelopeSchema.safeParse(body);
    if (!envelope.success) return;
    settle(routeBundleEvent(queryClient.getQueryData<BundleDetail>(key), envelope.data));
  };
};

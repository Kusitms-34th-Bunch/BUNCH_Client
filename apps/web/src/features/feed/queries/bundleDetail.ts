import { queryOptions, skipToken } from '@tanstack/react-query';
import { getBundleDetail } from '../api/bundleDetail';
import { feedKeys } from './keys';

/** 발행 번들 상세. 명의를 알기 전(undefined)에는 요청하지 않음 */
export const bundleDetailQueryOptions = (
  bunchId: string,
  bundleId: string,
  viewerId: string | null | undefined,
) =>
  queryOptions({
    queryKey: feedKeys.detail(bunchId, bundleId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : ({ signal }) => getBundleDetail(bunchId, bundleId, signal),
  });

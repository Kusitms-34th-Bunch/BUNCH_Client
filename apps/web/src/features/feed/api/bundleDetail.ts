import { bffApi, requestData } from '@/shared/api/bffApi';
import { bundleDetailSchema } from '../model/bundleDetail';

/** 발행 번들 상세(명세 084). 볼 수 있는지는 서버가 지금 번치 명의로 판단 */
export const getBundleDetail = (bunchId: string, bundleId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(
      `bunches/${encodeURIComponent(bunchId)}/published-bundles/${encodeURIComponent(bundleId)}`,
      { signal: signal ?? null },
    ),
    bundleDetailSchema,
    'bundle detail',
  );

import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { managedBundleSchema } from '../model/manageBundle';

const bundlePath = (bunchId: string, bundleId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/bundles/${encodeURIComponent(bundleId)}`;

/** 우리 번치 번들(번치 멤버만, 멤버 공개 포함). 공개 범위 화면의 지금 값·버전·수정 권한 */
export const getManagedBundle = (bunchId: string, bundleId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(bundlePath(bunchId, bundleId), { signal: signal ?? null }),
    managedBundleSchema,
    'managed bundle',
  );

/** 발행 번들 공개 범위 저장(명세 057). 버전이 어긋나면 BUNDLE_003 */
export const savePublishedVisibility = (
  bunchId: string,
  bundleId: string,
  { value, expectedVersion }: { value: 'PUBLIC' | 'PRIVATE'; expectedVersion: number },
) =>
  requestData(
    bffApi.put(`${bundlePath(bunchId, bundleId)}/visibility`, {
      json: {
        value,
        expectedVersion,
        mode: 'PUBLISHED',
      } satisfies components['schemas']['BundleVisibilityRequest'],
    }),
    managedBundleSchema,
    'save published visibility',
  );

/** 발행 번들 삭제(명세 048). 응답 data는 null */
export const deletePublishedBundle = async (bunchId: string, bundleId: string) => {
  await requestData(
    bffApi.delete(bundlePath(bunchId, bundleId)),
    z.null().optional(),
    'delete bundle',
  );
};

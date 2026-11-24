import { ApiError } from '@app/api-core';
import { type bffApi, requestData } from '@/shared/api/client/bffApi';
import { toWireId } from '@/shared/api/client/ids';
import { bundleSnapshotSchema, toBundleDetail } from '../model/bundle';

// 번들 API 파일이 함께 쓰는 요청 도구

export const REQUEST_ID_HEADER = 'X-Request-Id';

export const bundlePath = (bunchId: string, bundleId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/bundles/${encodeURIComponent(bundleId)}`;

// 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
export const wireIdOrThrow = (id: string) => {
  const wire = toWireId(id);
  if (wire === undefined) throw new ApiError({ category: 'validation', message: 'invalid id' });
  return wire;
};

export const requestBundle = async (request: ReturnType<typeof bffApi.get>, context: string) =>
  toBundleDetail(await requestData(request, bundleSnapshotSchema, context));

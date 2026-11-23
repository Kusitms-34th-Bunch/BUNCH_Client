import type { components } from '@app/api-core/generated';
import { ApiError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { bundlePhotoPicksSchema, type PhotoPicks, toPhotoPicks } from '../model/bundle';
import { readErrorDetail } from './bundleErrors';
import { bundlePath, wireIdOrThrow } from './bundleRequest';

type Schemas = components['schemas'];

/**
 * 사진 픽 저장: 내 픽의 원하는 최종 상태(picked)를 보내는 멱등 요청(토글이 아님), bundlePhotoId는 번들 사진 ID
 * expectedVersion은 그 사진의 내 픽 버전(picks.version)이고 상태가 달라질 때만 비교해 어긋나면 BUNDLE_003
 * 응답은 번들 전체가 아니라 그 사진의 픽 요약뿐임
 */
export const saveBundlePhotoPick = async ({
  bunchId,
  bundleId,
  bundlePhotoId,
  picked,
  expectedVersion,
}: {
  bunchId: string;
  bundleId: string;
  bundlePhotoId: string;
  picked: boolean;
  expectedVersion: number;
}): Promise<PhotoPicks> =>
  toPhotoPicks(
    await requestData(
      bffApi.put(
        `${bundlePath(bunchId, bundleId)}/photos/${encodeURIComponent(String(wireIdOrThrow(bundlePhotoId)))}/pick`,
        {
          json: { picked, expectedVersion } satisfies Schemas['BundlePhotoPickRequest'],
        },
      ),
      bundlePhotoPicksSchema,
      'save photo pick',
    ),
  );

/** 픽 버전 충돌(BUNDLE_003)에서 서버의 현재 픽 요약을 읽음, 다른 오류면 undefined */
export const readPickConflict = (error: unknown): PhotoPicks | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_003') return undefined;
  const detail = readErrorDetail(error, bundlePhotoPicksSchema);
  return detail ? toPhotoPicks(detail) : undefined;
};

import type { components } from '@app/api-core/generated';
import { bffApi } from '@/shared/api/bffApi';
import { createIdempotencyKey, IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import type { BundleDetail } from '../model/bundle';
import { bundlePath, REQUEST_ID_HEADER, requestBundle, wireIdOrThrow } from './bundleRequest';

type Schemas = components['schemas'];
type BundleStatus = BundleDetail['status'];

/** 정원(20장)을 넘길 때 처리: 전부 거절(ATOMIC_APPLY) 또는 남은 자리까지만 추가(PARTIAL_ADD) */
export type PhotoCapacityMode = 'ATOMIC_APPLY' | 'PARTIAL_ADD';

/**
 * 사진 구성 변경: 추가할 사진함 원본 ID와 제거할 번들 사진 ID를 한 번에 병합, 최종 1~20장
 * 같은 멱등 키·같은 본문은 처음 결과를 돌려줌(photoChangeResult.replayed)
 * 재선택 사진(reselectedPhotoIds)은 추가 목록에 든 기존 원본이고 ATOMIC_APPLY에서만 쓸 수 있음
 */
export const changeBundlePhotos = ({
  bunchId,
  bundleId,
  addPhotoIds,
  removeBundlePhotoIds,
  mode,
  idempotencyKey,
  capacityMode = 'ATOMIC_APPLY',
  reselectedPhotoIds = [],
}: {
  bunchId: string;
  bundleId: string;
  addPhotoIds: readonly string[];
  removeBundlePhotoIds: readonly string[];
  mode: BundleStatus;
  idempotencyKey: string;
  capacityMode?: PhotoCapacityMode;
  reselectedPhotoIds?: readonly string[];
}): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/photos/changes`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        addPhotoIds: addPhotoIds.map(wireIdOrThrow),
        removeBundlePhotoIds: removeBundlePhotoIds.map(wireIdOrThrow),
        mode,
        capacityMode,
        reselectedPhotoIds: reselectedPhotoIds.map(wireIdOrThrow),
      } satisfies Schemas['BundlePhotoChangesRequest'],
    }),
    'change bundle photos',
  );

/**
 * 사진 순서 이동: 이동 대상을 뺀 목록에서 서로 인접한 앞뒤 사진 사이로 옮김(맨 앞이면 previous, 맨 뒤면 next가 null)
 * 서로 인접하지 않은 앞뒤도 서버가 받아들여 뒤 사진 직전에 두고(뒤가 없으면 앞 사진 직후), 자기 자신·같은 사진을 앞뒤로 쓰거나 번들에 없는 사진이면 BUNDLE_006
 * 재시도할 때는 호출하는 쪽이 같은 requestId를 다시 넘겨야 서버가 옛 이동을 다시 적용하지 않음(같은 id에 다른 내용은 REQUEST_001). 지금 호출부는 재시도하지 않아 호출마다 새 ID를 씀
 */
export const moveBundlePhoto = ({
  bunchId,
  bundleId,
  bundlePhotoId,
  previousBundlePhotoId,
  nextBundlePhotoId,
  mode,
  requestId = createIdempotencyKey(),
}: {
  bunchId: string;
  bundleId: string;
  bundlePhotoId: string;
  previousBundlePhotoId: string | null;
  nextBundlePhotoId: string | null;
  mode: BundleStatus;
  requestId?: string;
}): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(
      `${bundlePath(bunchId, bundleId)}/photos/${encodeURIComponent(String(wireIdOrThrow(bundlePhotoId)))}/move`,
      {
        headers: { [REQUEST_ID_HEADER]: requestId },
        json: {
          ...(previousBundlePhotoId !== null && {
            previousBundlePhotoId: wireIdOrThrow(previousBundlePhotoId),
          }),
          ...(nextBundlePhotoId !== null && {
            nextBundlePhotoId: wireIdOrThrow(nextBundlePhotoId),
          }),
          mode,
        } satisfies Schemas['MoveBundlePhotoRequest'],
      },
    ),
    'move bundle photo',
  );

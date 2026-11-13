import type { components } from '@app/api-core/generated';
import { ApiError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import { type BundleDetail, bundleSnapshotSchema, toBundleDetail } from '../model/bundle';

type Schemas = components['schemas'];

const bundlePath = (bunchId: string, bundleId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/bundles/${encodeURIComponent(bundleId)}`;

// 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
const wireIdOrThrow = (id: string) => {
  const wire = toWireId(id);
  if (wire === undefined) throw new ApiError({ category: 'validation', message: 'invalid id' });
  return wire;
};

const requestBundle = async (request: ReturnType<typeof bffApi.get>, context: string) =>
  toBundleDetail(await requestData(request, bundleSnapshotSchema, context));

/**
 * 초안 생성: 같은 번치의 사진 1~20장(고른 순서), 같은 멱등 키로 다시 보내면 같은 초안
 * 서버는 생성자를 뺀 참여자 1명 이상을 요구함(화면이 참여자를 넘기도록 잇는 일은 실서버 연동 이슈에서)
 */
export const createBundle = async (
  bunchId: string,
  photoIds: readonly string[],
  idempotencyKey: string,
  participantMemberIds: readonly string[] = [],
) =>
  requestBundle(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/bundles`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        photoIds: photoIds.map(wireIdOrThrow),
        participantMemberIds: participantMemberIds.map(wireIdOrThrow),
      } satisfies Schemas['CreateBundleRequest'],
    }),
    'create bundle',
  );

/** 번들 상세. 없는 번들은 RESOURCE_001, 번치 멤버가 아니면 AUTH_002 */
export const getBundle = (bunchId: string, bundleId: string, signal?: AbortSignal) =>
  requestBundle(bffApi.get(bundlePath(bunchId, bundleId), { signal: signal ?? null }), 'bundle');

type SaveBase = {
  bunchId: string;
  bundleId: string;
  /** 저장하려는 필드의 최신 서버 버전(어긋나면 BUNDLE_003) */
  expectedVersion: number;
  /** 서버 상태와 같아야 함(발행 뒤 늦게 도착한 초안 저장은 BUNDLE_002) */
  mode: 'DRAFT' | 'PUBLISHED';
};

const saveText = (
  path: string,
  { value, expectedVersion, mode }: Omit<SaveBase, 'bunchId' | 'bundleId'> & { value: string },
  context: string,
) =>
  requestBundle(
    bffApi.put(path, {
      json: { value, expectedVersion, mode } satisfies Schemas['BundleTextRequest'],
    }),
    context,
  );

/** 제목 저장(전체 문자열 호환 경로, 제목 CRDT 저장은 후속 작업) */
export const saveBundleTitle = (input: SaveBase & { value: string }) =>
  saveText(`${bundlePath(input.bunchId, input.bundleId)}/title`, input, 'save title');

/** 내 코멘트 저장(본인 코멘트만) */
export const saveBundleComment = (input: SaveBase & { value: string }) =>
  saveText(`${bundlePath(input.bunchId, input.bundleId)}/comments/me`, input, 'save comment');

/** 공개 범위 저장 */
export const saveBundleVisibility = ({
  bunchId,
  bundleId,
  value,
  expectedVersion,
  mode,
}: SaveBase & { value: 'PUBLIC' | 'PRIVATE' }) =>
  requestBundle(
    bffApi.put(`${bundlePath(bunchId, bundleId)}/visibility`, {
      json: { value, expectedVersion, mode } satisfies Schemas['BundleVisibilityRequest'],
    }),
    'save visibility',
  );

/** 날짜 저장(null이면 해제) */
export const saveBundleDate = ({
  bunchId,
  bundleId,
  value,
  expectedVersion,
  mode,
}: SaveBase & { value: string | null }) =>
  requestBundle(
    bffApi.put(`${bundlePath(bunchId, bundleId)}/date`, {
      json: {
        ...(value === null ? {} : { value }),
        expectedVersion,
        mode,
      } satisfies Schemas['BundleDateRequest'],
    }),
    'save date',
  );

/** 참여자 추가: 같은 번치의 현재 멤버, 초안 참여자만 호출 */
export const addBundleParticipant = async (bunchId: string, bundleId: string, memberId: string) =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/participants`, {
      json: { memberId: wireIdOrThrow(memberId) } satisfies Schemas['BundleParticipantRequest'],
    }),
    'add participant',
  );

/** 참여자 제외: 생성자나 관리자만, 제외되는 멤버의 코멘트도 함께 삭제됨 */
export const removeBundleParticipant = async (
  bunchId: string,
  bundleId: string,
  memberId: string,
) =>
  requestBundle(
    bffApi.delete(
      `${bundlePath(bunchId, bundleId)}/participants/${encodeURIComponent(String(wireIdOrThrow(memberId)))}`,
    ),
    'remove participant',
  );

/**
 * 사진 구성 변경: 추가할 사진함 원본 ID와 제거할 번들 사진 ID를 한 번에 병합, 최종 1~20장
 * 같은 멱등 키·같은 본문은 처음 결과를 돌려줌
 */
export const changeBundlePhotos = ({
  bunchId,
  bundleId,
  addPhotoIds,
  removeBundlePhotoIds,
  mode,
  idempotencyKey,
}: {
  bunchId: string;
  bundleId: string;
  addPhotoIds: readonly string[];
  removeBundlePhotoIds: readonly string[];
  mode: 'DRAFT' | 'PUBLISHED';
  idempotencyKey: string;
}): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/photos/changes`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        addPhotoIds: addPhotoIds.map(wireIdOrThrow),
        removeBundlePhotoIds: removeBundlePhotoIds.map(wireIdOrThrow),
        mode,
        // 20장을 넘길 때의 처리 방식, 지금은 전부 적용하거나 전부 거절(ATOMIC_APPLY)로 고정
        capacityMode: 'ATOMIC_APPLY',
        reselectedPhotoIds: [],
      } satisfies Schemas['BundlePhotoChangesRequest'],
    }),
    'change bundle photos',
  );

/**
 * 사진 순서 이동: 이동 대상을 뺀 목록에서 서로 인접한 앞뒤 사진 사이로 옮김(맨 앞이면 previous, 맨 뒤면 next가 null)
 * 앞뒤가 최신 목록과 맞지 않으면 BUNDLE_006
 */
export const moveBundlePhoto = ({
  bunchId,
  bundleId,
  bundlePhotoId,
  previousBundlePhotoId,
  nextBundlePhotoId,
  mode,
}: {
  bunchId: string;
  bundleId: string;
  bundlePhotoId: string;
  previousBundlePhotoId: string | null;
  nextBundlePhotoId: string | null;
  mode: 'DRAFT' | 'PUBLISHED';
}): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(
      `${bundlePath(bunchId, bundleId)}/photos/${encodeURIComponent(String(wireIdOrThrow(bundlePhotoId)))}/move`,
      {
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

/** 번들 삭제: 생성자나 번치 관리자만, 번들·참여자·코멘트가 사라지고 사진함 원본은 그대로(응답 data는 null) */
export const deleteBundle = async (bunchId: string, bundleId: string) => {
  await requestData(bffApi.delete(bundlePath(bunchId, bundleId)), z.null(), 'delete bundle');
};

/**
 * 초안 나가기: 초안 참여자만(발행본은 BUNDLE_002)
 * 생성자가 나가면 초안이 삭제되어 null, 일반 참여자는 참여·코멘트가 지워진 최신 상세를 돌려줌
 */
export const leaveBundle = async (
  bunchId: string,
  bundleId: string,
): Promise<BundleDetail | null> => {
  const data = await requestData(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/leave`),
    bundleSnapshotSchema.nullable(),
    'leave bundle',
  );
  return data === null ? null : toBundleDetail(data);
};

/** 발행: 최신 revision을 보내고 같은 멱등 키로 다시 보내면 같은 결과 */
export const publishBundle = (
  bunchId: string,
  bundleId: string,
  expectedRevision: number,
  idempotencyKey: string,
): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/publish`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: { expectedRevision } satisfies Schemas['PublishBundleRequest'],
    }),
    'publish bundle',
  );

/** 버전 충돌(BUNDLE_003)에서 서버의 현재 값과 버전을 읽음, 다른 오류면 undefined */
export const readVersionConflict = (
  error: unknown,
): { value: unknown; version: number } | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_003') return undefined;
  const body = error.data as { error?: { detail?: { value?: unknown; version?: unknown } } };
  const detail = body?.error?.detail;
  return typeof detail?.version === 'number'
    ? { value: detail.value, version: detail.version }
    : undefined;
};

/** 발행 차단(BUNDLE_005)의 사유 목록, 다른 오류면 undefined */
export const readPublishBlockers = (error: unknown): readonly string[] | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_005') return undefined;
  const body = error.data as { error?: { detail?: { reasons?: unknown } } };
  const reasons = body?.error?.detail?.reasons;
  return Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === 'string') : [];
};

import type { components } from '@app/api-core/generated';
import { ApiError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { createIdempotencyKey, IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { LocationInput } from '../lib/locationOps';
import { presenceDataSchema } from '../lib/presence';
import {
  type BundleDetail,
  bundleLocationIntentResultSchema,
  bundlePhotoPicksSchema,
  bundleSnapshotSchema,
  bundleTitleStateSchema,
  type PhotoPicks,
  toBundleDetail,
  toLocationIntentResult,
  toPhotoPicks,
} from '../model/bundle';

type Schemas = components['schemas'];

const REQUEST_ID_HEADER = 'X-Request-Id';

const bundlePath = (bunchId: string, bundleId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/bundles/${encodeURIComponent(bundleId)}`;

/** 작성 중인 번들 수(번들 만들기 진입 확인, 기능명세 4.1.1). 목록 첫 쪽의 total만 읽음 */
export const getDraftBundleCount = async (bunchId: string, signal?: AbortSignal) =>
  (
    await requestData(
      bffApi.get(`bunches/${encodeURIComponent(bunchId)}/bundles`, {
        searchParams: { status: 'DRAFT', page: 0, size: 1 },
        signal: signal ?? null,
      }),
      z.object({ total: z.number().int().nonnegative() }),
      'draft bundle count',
    )
  ).total;

// 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
const wireIdOrThrow = (id: string) => {
  const wire = toWireId(id);
  if (wire === undefined) throw new ApiError({ category: 'validation', message: 'invalid id' });
  return wire;
};

const requestBundle = async (request: ReturnType<typeof bffApi.get>, context: string) =>
  toBundleDetail(await requestData(request, bundleSnapshotSchema, context));

/**
 * 초안 생성: 같은 번치의 사진 1~20장(고른 순서)과 나를 뺀 참여 멤버 1명 이상, 같은 멱등 키로 다시 보내면 같은 초안
 * 참여자는 생성자와 고른 멤버뿐이고 사진을 올렸다는 이유로 자동 참여하지 않음(비면 서버가 COMMON_001)
 */
export const createBundle = async (
  bunchId: string,
  photoIds: readonly string[],
  idempotencyKey: string,
  participantMemberIds: readonly string[],
  /** 마지막으로 적용한 추천 번들 id. 있으면 서버가 기본 제목을 추천 제목으로 하고 추천으로 만든 번들로 기록 */
  recommendationId?: string,
) =>
  requestBundle(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/bundles`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: {
        photoIds: photoIds.map(wireIdOrThrow),
        participantMemberIds: participantMemberIds.map(wireIdOrThrow),
        ...(recommendationId === undefined
          ? {}
          : { recommendationId: wireIdOrThrow(recommendationId) }),
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

/**
 * 제목 CRDT 병합: 서버 문서에서 파생한 Automerge 전체 저장 문서(base64)를 보내고 서버가 병합한 제목 상태를 받음
 * 버전·모드를 보내지 않고, 40자를 넘어도 자르지 않고 저장함(`titleTooLong`). 요청 id는 변경 이벤트의 requestId가 됨
 */
export const mergeBundleTitle = (input: {
  bunchId: string;
  bundleId: string;
  state: string;
  requestId: string;
}) =>
  requestData(
    bffApi.patch(`${bundlePath(input.bunchId, input.bundleId)}/title/crdt`, {
      headers: { [REQUEST_ID_HEADER]: input.requestId },
      json: { state: input.state } satisfies Schemas['BundleTitleCrdtRequest'],
    }),
    bundleTitleStateSchema,
    'merge title',
  );

/** 현재 presence(members·editing·typing) 복구용 조회. 입장 신호가 아니고 만료를 연장하지 않음 */
export const getBundlePresence = (bunchId: string, bundleId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bundlePath(bunchId, bundleId)}/presence`, { signal: signal ?? null }),
    presenceDataSchema,
    'bundle presence',
  );

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
  mode: 'DRAFT' | 'PUBLISHED';
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
  mode: 'DRAFT' | 'PUBLISHED';
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

/**
 * 발행: 최종 공개 범위를 함께 보내고(공개 범위 화면에서 뒤로 가도 저장하지 않음), 같은 멱등 키로 다시 보내면 같은 결과
 * expectedRevision은 호환 필드라 낡아도 최초 발행을 거절하지 않지만 같은 키 재시도 비교에는 쓰임
 */
export const publishBundle = (
  bunchId: string,
  bundleId: string,
  { visibility, expectedRevision }: { visibility: 'PUBLIC' | 'PRIVATE'; expectedRevision: number },
  idempotencyKey: string,
): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/publish`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: { visibility, expectedRevision } satisfies Schemas['PublishBundleRequest'],
    }),
    'publish bundle',
  );

/** 발행 번들 수정으로 보낼 최종 내용(사진은 남길 번들 사진 id 또는 사진함 원본 id 중 하나, 위치는 보낸 순서가 자리) */
export type PublishedEditInput = {
  /** 수정 화면을 연 때 받은 번들 revision(어긋나면 BUNDLE_003) */
  expectedRevision: number;
  title: string;
  /** 'YYYY-MM-DD', 없으면 null */
  date: string | null;
  photos: readonly ({ bundlePhotoId: string } | { photoId: string })[];
  locations: readonly LocationInput[];
};

/**
 * 발행 번들 수정: 메인 관리자가 최종 제목·날짜·사진 순서·위치를 한 번에 저장(원자적, 공개 범위·코멘트·참여 멤버는 바꾸지 않음)
 * requestId는 서버가 변경 이벤트의 상관 ID로만 쓰고 멱등 키가 아니므로, 호출부는 호출마다 새 ID를 씀
 * 낡은 revision은 같은 내용이어도 BUNDLE_003(detail에 현재 revision), 발행 전 초안은 BUNDLE_002, 권한이 없으면 AUTH_002
 */
export const editPublishedBundle = async (
  bunchId: string,
  bundleId: string,
  input: PublishedEditInput,
  requestId = createIdempotencyKey(),
): Promise<BundleDetail> =>
  await requestBundle(
    bffApi.put(`${bundlePath(bunchId, bundleId)}/published`, {
      headers: { [REQUEST_ID_HEADER]: requestId },
      json: {
        expectedRevision: input.expectedRevision,
        title: input.title,
        // 날짜 없음은 필드를 생략함(null을 보내지 않음)
        ...(input.date === null ? {} : { date: input.date }),
        photos: input.photos.map((photo) =>
          'bundlePhotoId' in photo
            ? { bundlePhotoId: wireIdOrThrow(photo.bundlePhotoId) }
            : { photoId: wireIdOrThrow(photo.photoId) },
        ),
        locations: input.locations.map((place, position) => ({
          ...toWirePlace(place),
          position,
        })),
        // 생성 타입은 주소를 문자열로만 적었지만 서버는 주소 없음을 null로 받음(명세)
      } satisfies Omit<Schemas['EditPublishedBundleRequest'], 'locations'> & {
        locations: (Omit<Schemas['BundleLocationInput'], 'address'> & { address: string | null })[];
      },
    }),
    'edit published bundle',
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

/** 장소 작업(`locations/intents`): 명령별로 쓰는 필드만 보냄(섞으면 서버가 400) */
export type LocationIntentRequest =
  | { intent: 'ADD'; place: LocationInput }
  | { intent: 'REPLACE'; targetLocationId: string; place: LocationInput }
  | { intent: 'REMOVE'; targetLocationId: string }
  | {
      intent: 'MOVE';
      targetLocationId: string;
      previousLocationId: string | null;
      nextLocationId: string | null;
    };

const toWirePlace = (place: LocationInput) => ({
  provider: place.provider,
  externalId: place.externalId,
  name: place.name,
  // 서버는 빈 문자열·공백 주소를 거부하고 주소 없음은 null만 받음
  address: place.address?.trim() ? place.address : null,
});

const toLocationIntentBody = (request: LocationIntentRequest) => {
  switch (request.intent) {
    case 'ADD':
      return { intent: 'ADD', locations: [toWirePlace(request.place)] };
    case 'REPLACE':
      return {
        intent: 'REPLACE',
        targetLocationId: wireIdOrThrow(request.targetLocationId),
        location: toWirePlace(request.place),
      };
    case 'REMOVE':
      return { intent: 'REMOVE', targetLocationId: wireIdOrThrow(request.targetLocationId) };
    case 'MOVE':
      return {
        intent: 'MOVE',
        targetLocationId: wireIdOrThrow(request.targetLocationId),
        ...(request.previousLocationId !== null && {
          previousLocationId: wireIdOrThrow(request.previousLocationId),
        }),
        ...(request.nextLocationId !== null && {
          nextLocationId: wireIdOrThrow(request.nextLocationId),
        }),
      };
  }
};

/**
 * 장소 추가·교체·삭제·이동을 서버 최신 목록에 적용(전체 덮어쓰기·버전 검사 없음, 나중에 처리한 변경이 반영됨)
 * 응답은 적용 뒤의 전체 장소 목록과 `locationVersion`. 거절 사유는 409의 `detail.reason`(`readLocationRejection`)
 */
export const applyBundleLocationIntent = async (
  bunchId: string,
  bundleId: string,
  request: LocationIntentRequest,
) =>
  toLocationIntentResult(
    await requestData(
      bffApi.post(`${bundlePath(bunchId, bundleId)}/locations/intents`, {
        json: toLocationIntentBody(request),
      }),
      bundleLocationIntentResultSchema,
      'apply location intent',
    ),
  );

/** 장소 작업이 거절된 사유(서버 `detail.reason`), 다른 오류면 undefined */
export type LocationRejection =
  | 'LOCATION_DUPLICATE'
  | 'LOCATION_CAPACITY_EXCEEDED'
  | 'LOCATION_REMOVED';

export const readLocationRejection = (error: unknown): LocationRejection | undefined => {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const body = error.data as { error?: { detail?: { reason?: unknown } } };
  const reason = body?.error?.detail?.reason;
  return reason === 'LOCATION_DUPLICATE' ||
    reason === 'LOCATION_CAPACITY_EXCEEDED' ||
    reason === 'LOCATION_REMOVED'
    ? reason
    : undefined;
};

/** 픽 버전 충돌(BUNDLE_003)에서 서버의 현재 픽 요약을 읽음, 다른 오류면 undefined */
export const readPickConflict = (error: unknown): PhotoPicks | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_003') return undefined;
  const body = error.data as { error?: { detail?: unknown } };
  const parsed = bundlePhotoPicksSchema.safeParse(body?.error?.detail);
  return parsed.success ? toPhotoPicks(parsed.data) : undefined;
};

/** 발행 차단(BUNDLE_005)의 사유 목록, 다른 오류면 undefined */
export const readPublishBlockers = (error: unknown): readonly string[] | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_005') return undefined;
  const body = error.data as { error?: { detail?: { reasons?: unknown } } };
  const reasons = body?.error?.detail?.reasons;
  return Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === 'string') : [];
};

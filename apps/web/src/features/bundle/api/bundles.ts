import type { components } from '@app/api-core/generated';
import { type ApiContract } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/client/idempotencyKey';
import { presenceDataSchema } from '../lib/presence';
import {
  type BundleDetail,
  bundleSnapshotSchema,
  bundleTitleStateSchema,
  toBundleDetail,
} from '../model/bundle';
import { bundlePath, REQUEST_ID_HEADER, requestBundle, wireIdOrThrow } from './bundleRequest';

type Schemas = components['schemas'];
type BundleStatus = BundleDetail['status'];
type BundleVisibility = NonNullable<BundleDetail['visibility']>;

// 목록 응답에서 total만 읽음
const draftBundleCountSchema = z.object({
  total: z.number().int().nonnegative(),
}) satisfies z.ZodType<Pick<ApiContract<Schemas['BundlePage']>, 'total'>>;

/** 작성 중인 번들 수(번들 만들기 진입 확인, 기능명세 4.1.1). 목록 첫 쪽의 total만 읽음 */
export const getDraftBundleCount = async (bunchId: string, signal?: AbortSignal) =>
  (
    await requestData(
      bffApi.get(`bunches/${encodeURIComponent(bunchId)}/bundles`, {
        searchParams: { status: 'DRAFT', page: 0, size: 1 },
        signal: signal ?? null,
      }),
      draftBundleCountSchema,
      'draft bundle count',
    )
  ).total;

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
  mode: BundleStatus;
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

/** 번들 삭제: 생성자나 번치 관리자만, 번들·참여자·코멘트가 사라지고 사진함 원본은 그대로(응답 data는 null) */
export const deleteBundle = async (bunchId: string, bundleId: string) => {
  await requestData(bffApi.delete(bundlePath(bunchId, bundleId)), z.null(), 'delete bundle');
};

// 생성자가 나가면 초안이 삭제되어 data가 null
const leaveBundleResponseSchema = bundleSnapshotSchema.nullable() satisfies z.ZodType<ApiContract<
  Schemas['BundleSnapshot']
> | null>;

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
    leaveBundleResponseSchema,
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
  { visibility, expectedRevision }: { visibility: BundleVisibility; expectedRevision: number },
  idempotencyKey: string,
): Promise<BundleDetail> =>
  requestBundle(
    bffApi.post(`${bundlePath(bunchId, bundleId)}/publish`, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: { visibility, expectedRevision } satisfies Schemas['PublishBundleRequest'],
    }),
    'publish bundle',
  );

import { ApiError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import type { LocationInput } from '../lib/locationOps';
import { bundleLocationIntentResultSchema, toLocationIntentResult } from '../model/bundle';
import { readErrorDetail } from './bundleErrors';
import { bundlePath, wireIdOrThrow } from './bundleRequest';

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

export const toWirePlace = (place: LocationInput) => ({
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

const locationRejectionSchema = z.object({
  reason: z.enum(['LOCATION_DUPLICATE', 'LOCATION_CAPACITY_EXCEEDED', 'LOCATION_REMOVED']),
});

/** 장소 작업이 거절된 사유(서버 `detail.reason`), 다른 오류면 undefined */
export type LocationRejection = z.infer<typeof locationRejectionSchema>['reason'];

export const readLocationRejection = (error: unknown): LocationRejection | undefined => {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  return readErrorDetail(error, locationRejectionSchema)?.reason;
};

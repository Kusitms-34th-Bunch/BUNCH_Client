import { ApiError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { type LeaseGrant, leaseGrantSchema } from '../model/bundle';

/** 편집할 대상(제목·날짜·번들 사진 한 장) */
export type LeaseTarget = 'TITLE' | 'DATE' | `PHOTO:${string}`;

/**
 * 편집권 통로. 실서버는 STOMP(/app/…/lease/acquire·heartbeat·release)로 주고받으므로 화면은 이 모양만 의존하고,
 * 지금 구현은 가짜 서버 전용 REST 대체 경로(UT·테스트에서 가짜 token을 받음), 실제 STOMP 연결은 후속 작업에서 교체
 */
export type LeaseTransport = {
  acquire: (_bunchId: string, _bundleId: string, _target: LeaseTarget) => Promise<LeaseGrant>;
  heartbeat: (
    _bunchId: string,
    _bundleId: string,
    _target: LeaseTarget,
    _token: string,
  ) => Promise<LeaseGrant>;
  release: (
    _bunchId: string,
    _bundleId: string,
    _target: LeaseTarget,
    _token: string,
  ) => Promise<void>;
};

const leasePath = (bunchId: string, bundleId: string, action: string) =>
  `bunches/${encodeURIComponent(bunchId)}/bundles/${encodeURIComponent(bundleId)}/leases/${action}`;

const releasedSchema = z.object({ target: z.string() });

export const fakeLeaseTransport: LeaseTransport = {
  acquire: (bunchId, bundleId, target) =>
    requestData(
      bffApi.post(leasePath(bunchId, bundleId, 'acquire'), { json: { target } }),
      leaseGrantSchema,
      'lease acquire',
    ),
  heartbeat: (bunchId, bundleId, target, token) =>
    requestData(
      bffApi.post(leasePath(bunchId, bundleId, 'heartbeat'), { json: { target, token } }),
      leaseGrantSchema,
      'lease heartbeat',
    ),
  release: async (bunchId, bundleId, target, token) => {
    await requestData(
      bffApi.post(leasePath(bunchId, bundleId, 'release'), { json: { target, token } }),
      releasedSchema,
      'lease release',
    );
  },
};

// 실서버에는 편집권 REST 경로가 없어(STOMP) 가짜 서버 모드가 아니면 요청을 보내지 않고 실패시킴
// 4xx 오류로 던져 저장 흐름이 다시 시도하지 않고 「저장 실패」로 알리게 함
const unavailable = (): never => {
  throw new ApiError({
    category: 'validation',
    status: 400,
    code: 'LEASE_UNAVAILABLE',
    message: 'lease transport is not available without STOMP',
  });
};

export const unavailableLeaseTransport: LeaseTransport = {
  acquire: () => Promise.resolve().then(unavailable),
  heartbeat: () => Promise.resolve().then(unavailable),
  release: () => Promise.resolve(),
};

// NEXT_PUBLIC_API_MOCKING은 빌드 때 값이 박혀 꺼진 빌드에서는 가짜 구현이 번들에서 빠짐
const current = (): LeaseTransport =>
  process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
    ? fakeLeaseTransport
    : unavailableLeaseTransport;

/** 화면이 쓰는 편집권 통로(후속 작업에서 STOMP 구현으로 교체) */
export const leaseTransport: LeaseTransport = {
  acquire: (...args) => current().acquire(...args),
  heartbeat: (...args) => current().heartbeat(...args),
  release: (...args) => current().release(...args),
};

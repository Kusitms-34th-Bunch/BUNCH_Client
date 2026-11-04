import { http } from 'msw';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { findScope, LEASE_TTL_MS, liveLeases, readJson, UUID } from './bundles';

// 실서버의 편집권은 STOMP(/app/…/lease/*) 통신, 이 경로는 가짜 서버 전용 대체 통로
// 응답 모양(LEASE_GRANTED·LEASE_HEARTBEAT의 data)과 거부 규칙만 명세 기준
const TARGET = /^(TITLE|DATE|PHOTO:[1-9]\d*)$/;

const parseTarget = (body: Record<string, unknown> | null) =>
  typeof body?.target === 'string' && TARGET.test(body.target) ? body.target : undefined;

const isValidToken = (body: Record<string, unknown> | null) =>
  typeof body?.token === 'string' && UUID.test(body.token);

const newToken = () => crypto.randomUUID();

export const bundleLeaseHandlers = [
  // 편집권 획득: 초안 참여자만, 다른 멤버가 쥐고 있으면 거부, 내가 다시 얻으면 token 교체
  http.post('/api/bunches/:bunchId/bundles/:id/leases/acquire', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const target = parseTarget(await readJson(request));
    if (!target) return fail(400, 'COMMON_001');
    const { bundle, isParticipant } = scope;
    if (bundle.status !== 'DRAFT') return fail(409, 'BUNDLE_002');
    if (!isParticipant) return fail(403, 'AUTH_002');

    const state = mockDb.get();
    const previous = state.bundleLeases.find(
      (lease) => lease.bundleId === bundle.id && lease.target === target,
    );
    const held = liveLeases(state, bundle.id).find((lease) => lease.target === target);
    if (held && held.memberId !== MOCK_MY_MEMBER_ID) return fail(409, 'BUNDLE_004');

    const lease = {
      bundleId: bundle.id,
      target,
      memberId: MOCK_MY_MEMBER_ID,
      token: newToken(),
      // 만료된 기록도 이어서 세어 대상마다 버전이 계속 오름
      leaseVersion: (previous?.leaseVersion ?? 0) + 1,
      expiresAt: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
    };
    mockDb.update((current) => ({
      ...current,
      bundleLeases: [
        ...current.bundleLeases.filter(
          (item) => !(item.bundleId === bundle.id && item.target === target),
        ),
        lease,
      ],
    }));
    return ok({
      target,
      token: lease.token,
      leaseVersion: lease.leaseVersion,
      expiresAt: lease.expiresAt,
    });
  }),

  // 편집권 갱신: 현재 token을 쥔 사람만, 유효 시간을 마지막 갱신 뒤 15초로 연장
  http.post('/api/bunches/:bunchId/bundles/:id/leases/heartbeat', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const body = await readJson(request);
    const target = parseTarget(body);
    if (!target || !isValidToken(body)) return fail(400, 'COMMON_001');
    const { bundle } = scope;
    const held = liveLeases(mockDb.get(), bundle.id).find((lease) => lease.target === target);
    if (!held || held.memberId !== MOCK_MY_MEMBER_ID || held.token !== body?.token) {
      return fail(409, 'BUNDLE_004');
    }
    const expiresAt = new Date(Date.now() + LEASE_TTL_MS).toISOString();
    mockDb.update((current) => ({
      ...current,
      bundleLeases: current.bundleLeases.map((item) =>
        item.bundleId === bundle.id && item.target === target ? { ...item, expiresAt } : item,
      ),
    }));
    return ok({ target, token: held.token, leaseVersion: held.leaseVersion, expiresAt });
  }),

  // 편집권 해제: 현재 token을 쥔 사람만
  http.post('/api/bunches/:bunchId/bundles/:id/leases/release', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const body = await readJson(request);
    const target = parseTarget(body);
    if (!target || !isValidToken(body)) return fail(400, 'COMMON_001');
    const { bundle } = scope;
    const held = liveLeases(mockDb.get(), bundle.id).find((lease) => lease.target === target);
    if (!held || held.memberId !== MOCK_MY_MEMBER_ID || held.token !== body?.token) {
      return fail(409, 'BUNDLE_004');
    }
    mockDb.update((current) => ({
      ...current,
      bundleLeases: current.bundleLeases.filter(
        (item) => !(item.bundleId === bundle.id && item.target === target),
      ),
    }));
    return ok({ target });
  }),
];

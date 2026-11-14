import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockDbState, MockKok } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { mockLocationId } from './feed';
import { viewerBunchId } from './follows';
import { bundleAccess } from './likes';

// 번들 장소 콕(명세 009·010·021, Swagger `BundleKoksResponse`·`KokResponse`). 지금 번치 명의

const locationsOf = (bundle: MockBundle) =>
  bundle.locations.map((location, index) => ({
    ...location,
    id: mockLocationId(bundle.id, index),
    index,
  }));

/** 같은 장소(제공자·외부 ID)를 지금 번치가 콕했는지(다른 번들·광고에서 콕한 것도 같은 장소) */
const kokOf = (
  state: MockDbState,
  bunchId: number,
  place: { provider: string; externalId: string },
) =>
  state.koks.find(
    (kok) =>
      kok.bunchId === bunchId &&
      kok.provider === place.provider &&
      kok.externalId === place.externalId,
  );

const kokResponse = (kok: MockKok) => ({
  id: kok.id,
  bunchId: kok.bunchId,
  provider: kok.provider,
  externalId: kok.externalId,
  name: kok.name,
  address: kok.address || null,
  sourceType: 'BUNDLE',
  sourceBundleId: kok.sourceBundleId,
  sourceLocationId: kok.sourceLocationId,
  pinnedByMemberId: kok.pinnedByMemberId,
  pinnedAt: kok.pinnedAt,
});

export const kokHandlers = [
  // GET /api/v1/bundles/{bundleId}/pinned-places — 장소별 지금 번치의 콕 여부(소속 번치가 없으면 모두 false)
  http.get('/api/bundles/:bundleId/pinned-places', ({ params }) => {
    const bundleId = toWireId(params.bundleId);
    if (bundleId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId, false);
    if ('error' in access) return access.error;
    const bundle = state.bundles.find((item) => item.id === bundleId);
    if (!bundle) return fail(404, 'RESOURCE_001');
    const viewer = access.viewer;
    return ok({
      bundleId,
      currentBunchId: viewer ?? null,
      canPin: viewer !== undefined,
      locations: locationsOf(bundle).map((location) => {
        const kok = viewer === undefined ? undefined : kokOf(state, viewer, location);
        return {
          id: location.id,
          provider: location.provider,
          externalId: location.externalId,
          name: location.name,
          address: location.address || null,
          position: location.index,
          pinned: kok !== undefined,
          pinId: kok?.id ?? null,
        };
      }),
    });
  }),

  // PUT /api/v1/bundles/{bundleId}/locations/{locationId}/pin — 이미 콕한 장소면 그 콕을 그대로
  http.put('/api/bundles/:bundleId/locations/:locationId/pin', ({ params }) => {
    const bundleId = toWireId(params.bundleId);
    const locationId = toWireId(params.locationId);
    if (bundleId === undefined || locationId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const access = bundleAccess(state, bundleId);
    if ('error' in access) return access.error;
    const { viewer } = access;
    if (viewer === undefined) return fail(409, 'BUNCH_010');
    const bundle = state.bundles.find((item) => item.id === bundleId);
    if (!bundle) return fail(404, 'RESOURCE_001');
    const location = locationsOf(bundle).find((item) => item.id === locationId);
    if (!location) return fail(404, 'RESOURCE_001');
    const existing = kokOf(state, viewer, location);
    if (existing) return ok(kokResponse(existing));
    const kok: MockKok = {
      id: state.koks.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      bunchId: viewer,
      provider: location.provider,
      externalId: location.externalId,
      name: location.name,
      address: location.address,
      sourceBundleId: bundleId,
      sourceLocationId: locationId,
      pinnedByMemberId: MOCK_MY_MEMBER_ID,
      pinnedAt: new Date().toISOString(),
    };
    mockDb.update((current) => ({ ...current, koks: [...current.koks, kok] }));
    return ok(kokResponse(kok));
  }),

  // DELETE /api/v1/pinned-places/{pinId} — 지금 번치의 콕만, 없으면 RESOURCE_001
  http.delete('/api/pinned-places/:pinId', ({ params }) => {
    const pinId = toWireId(params.pinId);
    if (pinId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const viewer = viewerBunchId(state);
    if (viewer === undefined) return fail(409, 'BUNCH_010');
    const kok = state.koks.find((item) => item.id === pinId && item.bunchId === viewer);
    if (!kok) return fail(404, 'RESOURCE_001');
    mockDb.update((current) => ({
      ...current,
      koks: current.koks.filter((item) => item.id !== pinId),
    }));
    return ok(null);
  }),
];

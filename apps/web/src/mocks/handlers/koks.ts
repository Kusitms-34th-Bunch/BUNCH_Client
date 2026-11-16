import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockDbState, MockKok } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { kokOf, mockLocationId } from './feed';
import { viewerBunchId } from './follows';
import { bundleAccess } from './likes';

// 번들 장소 콕(명세 005·009·010·021, Swagger `KoksResponse`·`BundleKoksResponse`·`KokResponse`). 지금 번치 명의

const locationsOf = (bundle: MockBundle) =>
  bundle.locations.map((location, index) => ({
    ...location,
    id: mockLocationId(bundle.id, index),
    index,
  }));

export const kokResponse = (kok: MockKok) => ({
  id: kok.id,
  bunchId: kok.bunchId,
  provider: kok.provider,
  externalId: kok.externalId,
  name: kok.name,
  address: kok.address || null,
  sourceType: kok.sourceAdvertisementId === null ? 'BUNDLE' : 'ADVERTISEMENT',
  sourceAdvertisementId: kok.sourceAdvertisementId,
  sourceBundleId: kok.sourceBundleId,
  sourceLocationId: kok.sourceLocationId,
  pinnedByMemberId: kok.pinnedByMemberId,
  pinnedAt: kok.pinnedAt,
});

/** 콕한 장소 카드(명세 005). 원래 번들을 지금 볼 수 없으면 출처 값을 비움 */
const kokCard = (state: MockDbState, kok: MockKok) => {
  const base = {
    id: kok.id,
    provider: kok.provider,
    externalId: kok.externalId,
    name: kok.name,
    address: kok.address || null,
    pinnedByMemberId: kok.pinnedByMemberId,
    pinnedAt: kok.pinnedAt,
  };
  const hidden = {
    sourceBundleId: null,
    sourceBunchId: null,
    sourceBunchName: null,
    sourceBundleTitle: null,
  };
  if (kok.sourceAdvertisementId !== null) {
    return { ...base, sourceType: 'ADVERTISEMENT', sourceAccessible: true, ...hidden };
  }
  const bundle = state.bundles.find((item) => item.id === kok.sourceBundleId);
  const bunch = state.bunches.find((item) => item.id === bundle?.bunchId);
  const accessible =
    bundle !== undefined &&
    bunch !== undefined &&
    !('error' in bundleAccess(state, bundle.id, false));
  return accessible
    ? {
        ...base,
        sourceType: 'BUNDLE',
        sourceAccessible: true,
        sourceBundleId: bundle.id,
        sourceBunchId: bunch.id,
        sourceBunchName: bunch.name,
        sourceBundleTitle: bundle.title,
      }
    : { ...base, sourceType: 'BUNDLE', sourceAccessible: false, ...hidden };
};

export const kokHandlers = [
  // GET /api/v1/pinned-places — 지금 번치의 콕(최근 콕한 순), 멤버 칩은 지금 멤버 전원(0개 포함)
  // ponytail: 커서는 넘긴 개수(숫자 글자). 실서버는 번치·필터 문맥을 담은 불투명 값
  http.get('/api/pinned-places', ({ request }) => {
    const params = new URL(request.url).searchParams;
    const size = Number(params.get('size') ?? 20);
    const offset = Number(params.get('cursor') ?? 0);
    if (
      !Number.isInteger(size) ||
      size < 1 ||
      size > 50 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      return fail(400, 'COMMON_001');
    }
    const memberParam = params.get('memberId');
    const memberId = memberParam === null ? undefined : toWireId(memberParam);
    if (memberParam !== null && memberId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const viewer = viewerBunchId(state);
    if (viewer === undefined) return fail(409, 'BUNCH_010');
    const koks = state.koks
      .filter((kok) => kok.bunchId === viewer)
      .sort((a, b) => b.pinnedAt.localeCompare(a.pinnedAt) || b.id - a.id);
    const members = state.memberships
      .filter((membership) => membership.bunchId === viewer)
      .map((membership) => {
        const member = state.members.find((item) => item.memberId === membership.memberId);
        return {
          membershipId: membership.memberId,
          memberId: membership.memberId,
          nickname: member?.nickname ?? null,
          imageUrl: member?.imageUrl ?? null,
          count: koks.filter((kok) => kok.pinnedByMemberId === membership.memberId).length,
        };
      });
    // 지금 멤버 칩에 없는 멤버면 전체로 돌아감(명세 005)
    const selected = members.some((member) => member.memberId === memberId) ? memberId : undefined;
    const filtered =
      selected === undefined ? koks : koks.filter((kok) => kok.pinnedByMemberId === selected);
    const page = filtered.slice(offset, offset + size);
    return ok({
      bunchId: viewer,
      selectedMemberId: selected ?? null,
      totalCount: koks.length,
      members,
      items: page.map((kok) => kokCard(state, kok)),
      nextCursor: offset + size < filtered.length ? String(offset + size) : null,
    });
  }),

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
      id: state.lastKokId + 1,
      bunchId: viewer,
      provider: location.provider,
      externalId: location.externalId,
      name: location.name,
      address: location.address ?? '',
      sourceBundleId: bundleId,
      sourceLocationId: locationId,
      sourceAdvertisementId: null,
      pinnedByMemberId: MOCK_MY_MEMBER_ID,
      pinnedAt: new Date().toISOString(),
    };
    mockDb.update((current) => ({ ...current, koks: [...current.koks, kok], lastKokId: kok.id }));
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

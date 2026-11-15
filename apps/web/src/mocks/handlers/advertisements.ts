import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockKok } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { adResponse, kokOf, MOCK_ADS } from './feed';
import { viewerBunchId } from './follows';
import { kokResponse } from './koks';

// 피드 광고 조회·콕·숨기기(명세 024·022·023). 콕 취소는 번들 장소와 같은 `DELETE /pinned-places/{pinId}`

const adOf = (value: Parameters<typeof toWireId>[0]) => {
  const id = toWireId(value);
  return id === undefined ? undefined : MOCK_ADS.find((ad) => ad.id === id);
};

export const advertisementHandlers = [
  // GET /api/v1/feed/advertisements/{advertisementId}
  http.get('/api/feed/advertisements/:advertisementId', ({ params }) => {
    const ad = adOf(params.advertisementId);
    if (!ad) return fail(404, 'RESOURCE_001');
    return ok(adResponse(mockDb.get(), ad));
  }),

  // PUT /api/v1/feed/advertisements/{advertisementId}/pin — 이미 콕한 장소면 그 콕을 그대로
  http.put('/api/feed/advertisements/:advertisementId/pin', ({ params }) => {
    const ad = adOf(params.advertisementId);
    if (!ad) return fail(404, 'RESOURCE_001');
    const state = mockDb.get();
    const viewer = viewerBunchId(state);
    if (viewer === undefined) return fail(409, 'BUNCH_010');
    const existing = kokOf(state, viewer, ad.place);
    if (existing) return ok(kokResponse(existing));
    const kok: MockKok = {
      id: state.lastKokId + 1,
      bunchId: viewer,
      provider: ad.place.provider,
      externalId: ad.place.externalId,
      name: ad.place.name,
      address: ad.place.address,
      sourceBundleId: null,
      sourceLocationId: null,
      sourceAdvertisementId: ad.id,
      pinnedByMemberId: MOCK_MY_MEMBER_ID,
      pinnedAt: new Date().toISOString(),
    };
    mockDb.update((current) => ({ ...current, koks: [...current.koks, kok], lastKokId: kok.id }));
    return ok(kokResponse(kok));
  }),

  // PUT /api/v1/feed/advertisements/{advertisementId}/hide — 사용자 단위, 다시 숨겨도 같음
  http.put('/api/feed/advertisements/:advertisementId/hide', ({ params }) => {
    const ad = adOf(params.advertisementId);
    if (!ad) return fail(404, 'RESOURCE_001');
    mockDb.update((current) =>
      current.hiddenAdIds.includes(ad.id)
        ? current
        : { ...current, hiddenAdIds: [...current.hiddenAdIds, ad.id] },
    );
    return ok(null);
  }),
];

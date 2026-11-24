import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { toWireId } from '@/shared/api/client/ids';
import { ALL_MEMBERS } from '../lib/types';
import { pinnedPlacesResponseSchema, toPinnedPlaces } from '../model/pinnedPlaces';

// 한 번에 받는 장수(서버 최대 50). 다음 쪽은 응답의 nextCursor로 이어 받음(기능명세서 8.1.3 상세 5)
const PAGE_SIZE = 50;

/** 지금 번치의 콕한 장소(명세 005). 「전체」가 아니면 처음 콕한 멤버로 거름. `cursor`가 없으면 첫 쪽 */
export const getPinnedPlaces = async (
  memberId: string,
  cursor: string | undefined,
  signal?: AbortSignal,
) => {
  const wireMemberId = memberId === ALL_MEMBERS ? undefined : toWireId(memberId);
  // 잘못된 id로 필터 없이 받으면 칩과 목록이 어긋나 요청 전에 막음
  if (memberId !== ALL_MEMBERS && wireMemberId === undefined) {
    throw new Error(`invalid member id: ${memberId}`);
  }
  const data = await requestData(
    bffApi.get('pinned-places', {
      searchParams: {
        size: PAGE_SIZE,
        ...(wireMemberId ? { memberId: wireMemberId } : {}),
        ...(cursor ? { cursor } : {}),
      },
      signal: signal ?? null,
    }),
    pinnedPlacesResponseSchema,
    'pinned places',
  );
  return toPinnedPlaces(data);
};

/** 콕에서 빼기(명세 009는 없거나 다른 번치의 콕도 200, 가짜 서버는 404) */
export const removePinnedPlace = async (pinId: string) => {
  const wireId = toWireId(pinId);
  if (wireId === undefined) throw new Error(`invalid pin id: ${pinId}`);
  await requestData(bffApi.delete(`pinned-places/${wireId}`), z.null().optional(), 'unpin place');
};

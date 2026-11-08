import { useCallback, useMemo, useState } from 'react';
import { placeMembersFixture, placesFixture } from '../fixtures/places.fixture';
import { sortByRecent } from '../lib/places';

/**
 * 콕한 장소 목록과 멤버(최근 콕한 순). 콕에서 뺀 장소는 되돌리기 전까지 목록에서 숨김
 * API 연결 전 임시: 뺀 목록은 이 화면의 상태라 화면을 나가면 fixture로 돌아감
 * 연결하면 목록 query와 빼기·되돌리기 mutation(낙관적 갱신)으로 대체
 */
export function useBunchPlaces() {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

  const places = useMemo(
    () => sortByRecent(placesFixture.filter((place) => !removed.has(place.id))),
    [removed],
  );

  const remove = useCallback((placeId: string) => {
    setRemoved((current) => new Set(current).add(placeId));
  }, []);

  const restore = useCallback((placeId: string) => {
    setRemoved((current) => {
      const next = new Set(current);
      next.delete(placeId);
      return next;
    });
  }, []);

  return { members: placeMembersFixture, places, remove, restore };
}

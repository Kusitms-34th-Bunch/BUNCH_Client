'use client';

import { PlacePickSheet } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import { toWireId } from '@/shared/api/ids';
import type { FeedPlace } from '../../lib/types';
import { bundleKoksQueryOptions } from '../../queries/kok';

type PlacePickOverlayProps = ScreenOverlayProps & {
  bundleId: string;
  /** 지금 번치 명의(소속 번치가 없으면 null, 콕 여부도 없음) */
  viewerId: string | null | undefined;
  places: FeedPlace[];
  /** 소속 번치가 있을 때만 실행하고, 없으면 안내 */
  asBunch: (_action: () => void) => void;
  /** 콕하지 않은 장소를 눌렀을 때 */
  onPick: (_place: FeedPlace) => void;
  /** 콕한 장소를 눌렀을 때(콕 ID는 취소에 씀) */
  onCancelPick: (_place: FeedPlace, _pinId: number) => void;
};

/** 장소별 콕 여부는 서버(명세 021)에서 받고, 누르면 캐시가 바로 바뀌어 열린 시트 버튼도 바뀜 */
export function PlacePickOverlay({
  bundleId,
  viewerId,
  places,
  asBunch,
  onPick,
  onCancelPick,
  ...rootProps
}: PlacePickOverlayProps) {
  // 소속 번치가 없으면 받지 않고 모두 「콕하기」
  const koks = useQuery({
    ...bundleKoksQueryOptions(bundleId, viewerId),
    enabled: viewerId !== null,
  });
  const kokOf = (place: FeedPlace) =>
    koks.data?.locations.find((location) => location.id === toWireId(place.id));
  return (
    <PlacePickSheet
      {...rootProps}
      places={places.map((place) => ({
        id: place.id,
        name: place.name,
        address: place.address,
        picked: kokOf(place)?.pinned === true,
      }))}
      onPick={(placeId) =>
        asBunch(() => {
          const place = places.find(({ id }) => id === placeId);
          if (!place) return;
          const kok = kokOf(place);
          if (!kok?.pinned) return onPick(place);
          // 방금 콕해 콕 ID를 아직 모르면 응답을 기다림(취소할 대상이 없음)
          if (kok.pinId != null) onCancelPick(place, kok.pinId);
        })
      }
    />
  );
}

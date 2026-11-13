'use client';

import { PlacePickSheet } from '@app/design-system/web';
import { useState } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { FeedPlace } from '../../lib/types';

export type PickStates = Record<string, boolean>;

type PlacePickOverlayProps = ScreenOverlayProps & {
  places: FeedPlace[];
  initialPicks: PickStates;
  /** 콕했을 때(다시 열어도 유지) */
  onPicked: (_placeId: string) => void;
  /** 소속 번치가 없으면 담긴 표시 없음 */
  hasBunch: boolean;
  /** 소속 번치가 있을 때만 실행하고, 없으면 안내 */
  asBunch: (_action: () => void) => void;
  /** 담긴 장소를 눌렀을 때 */
  onCancelPick: (_place: FeedPlace) => void;
};

/** 콕하면 열린 시트의 버튼이 바로 바뀌게 함(overlay는 열 때의 값으로 그려짐) */
export function PlacePickOverlay({
  places,
  initialPicks,
  onPicked,
  hasBunch,
  asBunch,
  onCancelPick,
  ...rootProps
}: PlacePickOverlayProps) {
  const [picked, setPicked] = useState(initialPicks);
  const isPicked = (place: FeedPlace) => (hasBunch ? (picked[place.id] ?? place.picked) : false);
  return (
    <PlacePickSheet
      {...rootProps}
      places={places.map((place) => ({
        id: place.id,
        name: place.name,
        address: place.address,
        picked: isPicked(place),
      }))}
      onPick={(placeId) =>
        asBunch(() => {
          const place = places.find(({ id }) => id === placeId);
          if (!place) return;
          if (isPicked(place)) return onCancelPick(place);
          onPicked(place.id);
          setPicked((current) => ({ ...current, [place.id]: true }));
        })
      }
    />
  );
}

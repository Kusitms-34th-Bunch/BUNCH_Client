import type { KokPlace } from './types';
import { PLACES_MESSAGES } from '../constants/messages';

/** 주소 복사 값: 저장된 주소 전체, 없으면 장소 이름(기능명세 8.1.7) */
export const copyTextOf = (place: KokPlace) => place.address || place.name;

/** 장소 카드의 출처 표시: 번들이면 번치 이름과 번들 제목, 광고면 BUNCH SPOT, 볼 수 없으면 안내 */
export const placeSourceProps = (place: KokPlace) => {
  switch (place.source.kind) {
    case 'bundle':
      return { source: place.source.bunchName, bundleTitle: place.source.bundleTitle };
    case 'pick':
      return { source: PLACES_MESSAGES.pickSource };
    case 'unavailable':
      return { source: PLACES_MESSAGES.unavailableSource };
  }
};

import type { KokPlace } from './types';

/** 주소 복사 값: 저장된 주소 전체, 없으면 장소 이름(기능명세 8.1.7) */
export const copyTextOf = (place: KokPlace) => place.address || place.name;

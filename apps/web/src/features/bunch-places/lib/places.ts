import { ALL_MEMBERS, type KokPlace } from './types';

/** 최근에 콕한 장소가 위(기능명세 8.1.3 로직 1) */
export const sortByRecent = (places: readonly KokPlace[]) =>
  [...places].sort((a, b) => b.pickedAt.localeCompare(a.pickedAt));

/** 멤버별 콕한 장소 수와 전체 수(`ALL_MEMBERS`). 나간 멤버(pickedBy null)는 전체에만 셈 */
export const countByMember = (places: readonly KokPlace[]): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = { [ALL_MEMBERS]: places.length };
  for (const place of places) {
    if (place.pickedBy !== null) counts[place.pickedBy] = (counts[place.pickedBy] ?? 0) + 1;
  }
  return counts;
};

/** 고른 칩의 장소만(「전체」는 모두) */
export const filterByMember = (places: readonly KokPlace[], selectedId: string) =>
  selectedId === ALL_MEMBERS ? places : places.filter((place) => place.pickedBy === selectedId);

/** 주소 복사 값: 저장된 주소 전체, 없으면 장소 이름(기능명세 8.1.7) */
export const copyTextOf = (place: KokPlace) => place.address || place.name;

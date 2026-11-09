/** 대표 사진 투표: 사진 id → 그 사진을 픽한 멤버 id(픽한 순서) */
export type Picks = Readonly<Record<string, readonly string[]>>;

/** 이 사진을 픽한 멤버 */
export const pickersOf = (picks: Picks, photoId: string): readonly string[] => picks[photoId] ?? [];

/** 내가 이 사진을 이미 픽했는지 */
export const hasPicked = (picks: Picks, photoId: string, memberId: string): boolean =>
  pickersOf(picks, photoId).includes(memberId);

/**
 * 이 사진을 픽하거나, 이미 픽했으면 취소(같은 버튼을 다시 누르면 해제). 다른 사진의 픽은 건드리지 않음
 * 한 사람이 여러 사진을 픽할 수 있는지는 기획에 없어 막지 않음
 */
export const togglePick = (picks: Picks, photoId: string, memberId: string): Picks => {
  const current = pickersOf(picks, photoId);
  const next = current.includes(memberId)
    ? current.filter((id) => id !== memberId)
    : [...current, memberId];
  return { ...picks, [photoId]: next };
};

/** 목록을 n개씩 끊음(픽한 멤버 칩을 한 줄 4개씩 보임) */
export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

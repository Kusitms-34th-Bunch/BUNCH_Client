/** 사진 픽: 사진 id → 그 사진을 픽한 멤버 id(참여 시각 순) */
export type Picks = Readonly<Record<string, readonly string[]>>;

/** 이 사진을 픽한 멤버 */
export const pickersOf = (picks: Picks, photoId: string): readonly string[] => picks[photoId] ?? [];

/** 내가 이 사진을 이미 픽했는지 */
export const hasPicked = (picks: Picks, photoId: string, memberId: string): boolean =>
  pickersOf(picks, photoId).includes(memberId);

/**
 * 내가 이 사진을 픽한 상태로 바꾼 결과(서버 응답을 기다리지 않고 먼저 보여 줄 때 씀). 다른 사진과 다른 멤버의 픽은 그대로 둠
 * 같은 상태로 바꾸면 같은 목록을 돌려줌
 */
export const withPick = (
  picks: Picks,
  photoId: string,
  memberId: string,
  picked: boolean,
): Picks => {
  const current = pickersOf(picks, photoId);
  if (current.includes(memberId) === picked) return picks;
  return {
    ...picks,
    [photoId]: picked ? [...current, memberId] : current.filter((id) => id !== memberId),
  };
};

/**
 * 픽 화면에 들어온 뒤에는 다른 멤버의 픽을 바꾸지 않고(기능 spec 4.3.5 로직 3), 내 픽만 지금 값으로 보임
 * frozen은 들어올 때 받아 둔 픽이고, live는 내가 누른 것까지 반영한 지금 픽
 */
export const withOwnPicks = (frozen: Picks, live: Picks, memberId: string): Picks =>
  Object.fromEntries(
    Object.keys({ ...frozen, ...live }).map((photoId) => {
      const others = pickersOf(frozen, photoId).filter((id) => id !== memberId);
      return [photoId, hasPicked(live, photoId, memberId) ? [...others, memberId] : others];
    }),
  );

/** 목록을 n개씩 끊음(픽한 멤버 칩을 한 줄 4개씩 보임) */
export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

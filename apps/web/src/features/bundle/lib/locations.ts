import type { DraftLocation } from './types';

/** 위치를 다른 자리로 옮김. 자리는 0부터이고 범위를 벗어나면 맨 끝으로 맞춤(같은 자리면 그대로) */
export const moveLocation = (
  locations: readonly DraftLocation[],
  locationId: string,
  toIndex: number,
): readonly DraftLocation[] => {
  const from = locations.findIndex((location) => location.id === locationId);
  const target = locations[from];
  if (!target) return locations;
  const rest = locations.filter((location) => location.id !== locationId);
  const to = Math.min(Math.max(0, toIndex), rest.length);
  if (to === from) return locations;
  return [...rest.slice(0, to), target, ...rest.slice(to)];
};

import type { DraftLocation } from './types';
import { MAX_LOCATIONS } from '../constants/messages';
import { moveLocation } from './locations';

/** 서버에 보낼 장소(provider·externalId·name·address). 주소 없음은 null */
export type LocationInput = {
  provider: string;
  externalId: string;
  name: string;
  address: string | null;
};

/**
 * 내가 한 위치 변경(서버 응답을 기다리는 동안 목록 위에 얹어 보임). 번호는 요청 순서
 * 이동은 자리 번호가 아니라 이동한 뒤의 앞뒤 이웃으로 기록해, 앞선 변경이 끝난 서버 목록에서 앞뒤 id를 찾아 보냄
 */
export type LocationOp =
  | { no: number; kind: 'add'; place: LocationInput }
  | { no: number; kind: 'replace'; targetId: string; place: LocationInput }
  | { no: number; kind: 'remove'; targetId: string }
  | {
      no: number;
      kind: 'move';
      targetId: string;
      toIndex: number;
      /** 이동한 뒤의 앞 이웃(없으면 맨 앞). 서버 id가 있으면 id로, 아직 없으면(내가 막 추가한 줄) 키로 서버 목록에서 찾음 */
      previous: LocationNeighbor | null;
      next: LocationNeighbor | null;
    };

/** 이동 기준이 되는 이웃 줄: 서버 행 id(있을 때)와 장소 키 */
export type LocationNeighbor = { id: string | null; key: string };

/** 같은 장소인지 가르는 키(서버도 provider+externalId로 중복을 판단) */
export const locationKey = (place: Pick<LocationInput, 'provider' | 'externalId'>) =>
  `${place.provider}:${place.externalId}`;

/** 서버 id를 아직 받지 못한 내가 추가한 줄(눌러도 바꾸거나 옮기지 않음) */
export const PENDING_ID_PREFIX = 'pending:';
export const isPendingLocation = (location: Pick<DraftLocation, 'id'>) =>
  location.id.startsWith(PENDING_ID_PREFIX);

// 검색 결과(PlaceResult)처럼 id가 든 객체가 넘어와도 줄 id를 덮지 않도록 필요한 필드만 골라 줄을 만듦
const toRow = (id: string, place: LocationInput): DraftLocation => ({
  id,
  provider: place.provider,
  externalId: place.externalId,
  name: place.name,
  address: place.address,
});

const pendingRow = (no: number, place: LocationInput): DraftLocation =>
  toRow(`${PENDING_ID_PREFIX}${no}`, place);

/**
 * 변경 하나를 목록에 적용(서버가 받아들일 결과를 먼저 보임)
 * 정원 초과·중복은 서버가 거절하므로 목록을 바꾸지 않고, 없어진 줄을 바꾸려 하면 서버처럼 정원이 남을 때 맨 끝에 새로 더함
 */
export const applyLocationOp = (
  locations: readonly DraftLocation[],
  op: LocationOp,
): readonly DraftLocation[] => {
  const hasKey = (place: LocationInput, ignoreId?: string) =>
    locations.some(
      (location) => location.id !== ignoreId && locationKey(location) === locationKey(place),
    );

  switch (op.kind) {
    case 'add':
      return locations.length >= MAX_LOCATIONS || hasKey(op.place)
        ? locations
        : [...locations, pendingRow(op.no, op.place)];
    case 'replace': {
      if (hasKey(op.place, op.targetId)) return locations;
      if (!locations.some((location) => location.id === op.targetId)) {
        return locations.length >= MAX_LOCATIONS
          ? locations
          : [...locations, pendingRow(op.no, op.place)];
      }
      return locations.map((location) =>
        location.id === op.targetId ? toRow(location.id, op.place) : location,
      );
    }
    case 'remove':
      return locations.filter((location) => location.id !== op.targetId);
    case 'move':
      return moveLocation(locations, op.targetId, op.toIndex);
  }
};

/** 서버 목록 위에 아직 끝나지 않은 내 변경을 순서대로 얹은 목록 */
export const applyLocationOps = (
  base: readonly DraftLocation[],
  ops: readonly LocationOp[],
): readonly DraftLocation[] => ops.reduce(applyLocationOp, base);

const toNeighbor = (location: DraftLocation | undefined): LocationNeighbor | null =>
  location
    ? { id: isPendingLocation(location) ? null : location.id, key: locationKey(location) }
    : null;

/**
 * 옮긴 뒤의 목록에서 그 줄의 앞·뒤 이웃(없으면 null)
 * 이웃이 그 사이 다른 장소로 교체돼도 서버 행 id는 그대로라 id로 찾아야 맞고, 서버 id가 없는 이웃만 키로 찾음
 */
export const neighborsAfterMove = (
  locations: readonly DraftLocation[],
  targetId: string,
  toIndex: number,
): { previous: LocationNeighbor | null; next: LocationNeighbor | null } => {
  const moved = moveLocation(locations, targetId, toIndex);
  const at = moved.findIndex((location) => location.id === targetId);
  return { previous: toNeighbor(moved[at - 1]), next: toNeighbor(moved[at + 1]) };
};

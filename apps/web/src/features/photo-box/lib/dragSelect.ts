/** 쓸어서 고르는 영역이 사진 칸을 찾는 데 쓰는 속성(고를 수 있는 사진 칸에만 붙임) */
export const PHOTO_ID_ATTRIBUTE = 'data-photo-id';

/** 길게 눌러 날짜를 옮길 수 있는 사진 칸에 붙이는 속성(그 사진은 오래 누르고 있으면 쓸기가 아니라 끌기로 넘어감) */
export const PHOTO_DRAGGABLE_ATTRIBUTE = 'data-photo-draggable';

/** 길게 누르기: 이만큼 누르고 있어야 날짜 이동 끌기가 시작되고, 그 전에 움직이면 쓸어서 고르기·스크롤로 넘김 */
export const LONG_PRESS_MS = 300;

/**
 * 시작한 사진(anchor)부터 손가락이 있는 사진(current)까지를 범위로 보고, 사진마다 이번 쓸기가 원하는 선택 상태를 갱신
 * 범위 안은 target, 범위에서 벗어난 사진은 쓸기를 시작할 때의 상태(initial)로 돌아감(되돌아오면 줄어드는 동작)
 * `desired`를 직접 고쳐 쓰며, 손댄 적 없는 사진은 넣지 않음
 */
export const desiredStates = (
  desired: Map<string, boolean>,
  ids: readonly string[],
  initial: ReadonlySet<string>,
  target: boolean,
  anchor: number,
  current: number,
): void => {
  const low = Math.min(anchor, current);
  const high = Math.max(anchor, current);
  for (const id of desired.keys()) desired.set(id, initial.has(id));
  for (let index = low; index <= high; index += 1) {
    const id = ids[index];
    if (id !== undefined) desired.set(id, target);
  }
};

/**
 * 원하는 상태와 현재 선택이 다른 사진 중 지금 토글할 한 장
 * 해제를 먼저(시작 사진에서 먼 것부터) 하고 그다음 선택을 시작 사진에 가까운 것부터 함: 최대 장수에 걸리지 않게 하고 선택 번호가 쓸어 간 순서가 되게
 */
export const nextToggle = (
  desired: ReadonlyMap<string, boolean>,
  selection: readonly string[],
  indexById: ReadonlyMap<string, number>,
  anchor: number,
): string | undefined => {
  const selected = new Set(selection);
  let remove: { id: string; distance: number } | undefined;
  let add: { id: string; distance: number } | undefined;
  for (const [id, want] of desired) {
    if (selected.has(id) === want) continue;
    const distance = Math.abs((indexById.get(id) ?? anchor) - anchor);
    if (want) {
      if (!add || distance < add.distance) add = { id, distance };
    } else if (!remove || distance > remove.distance) {
      remove = { id, distance };
    }
  }
  return (remove ?? add)?.id;
};

// 위·아래 가장자리에서 이만큼 안쪽에 들어오면 스크롤을 시작하고, 깊이 들어갈수록 빨라져 가장 끝에서 프레임당 MAX만큼 감
const EDGE_ZONE_PX = 80;
const MAX_SCROLL_PX_PER_FRAME = 12;

/** 손가락 높이(pointerY)와 보이는 영역(top~bottom)으로 이번 프레임에 스크롤할 px(가장자리 밖이면 0) */
export const autoScrollStep = (pointerY: number, top: number, bottom: number): number => {
  let speed = 0;
  if (pointerY < top + EDGE_ZONE_PX) {
    speed = -Math.min(1, (top + EDGE_ZONE_PX - pointerY) / EDGE_ZONE_PX);
  } else if (pointerY > bottom - EDGE_ZONE_PX) {
    speed = Math.min(1, (pointerY - (bottom - EDGE_ZONE_PX)) / EDGE_ZONE_PX);
  }
  if (speed === 0) return 0;
  // 일부 기기는 scrollTop을 정수로 맞추므로 한 프레임에 최소 1px은 움직임
  return Math.sign(speed) * Math.max(1, Math.round(Math.abs(speed) * MAX_SCROLL_PX_PER_FRAME));
};

/** 사진 목록을 스크롤하는 가장 가까운 조상(세로 스크롤이 실제로 가능한 것) */
export const findScroller = (element: HTMLElement | null): HTMLElement | undefined => {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return undefined;
};

export const photoElementAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>(`[${PHOTO_ID_ATTRIBUTE}]`) ?? undefined;

export const photoIdAt = (x: number, y: number) =>
  photoElementAt(x, y)?.getAttribute(PHOTO_ID_ATTRIBUTE) ?? undefined;

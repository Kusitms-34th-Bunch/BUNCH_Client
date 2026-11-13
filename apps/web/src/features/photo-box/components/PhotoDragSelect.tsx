'use client';

import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { usePhotoSelection } from '../contexts/photoSelection';
import {
  PHOTO_DRAGGABLE_ATTRIBUTE,
  PHOTO_ID_ATTRIBUTE,
  desiredStates,
  nextToggle,
} from '../lib/dragSelect';

// 이만큼 움직여야 쓸기로 봄(그 안의 흔들림은 그냥 누르기)
const START_DISTANCE_PX = 8;
// 포인터가 이미 처리한 탭·쓸기 뒤에 따라오는 클릭을 이 시간 동안 막음
const CLICK_SUPPRESS_MS = 400;
// 길게 누르기 끌기가 시작되는 시점과 이쪽 시계가 어긋나도 같은 사진이 두 번 토글되지 않도록 이만큼 일찍 끌기 쪽으로 넘김
const LONG_PRESS_MARGIN_MS = 20;
// 스크롤이 이 시간 안에 있었다면 누른 순간 목록이 움직이던 것(관성 스크롤을 멈추려는 터치)으로 봄
const SCROLL_SETTLE_MS = 100;

type PhotoDragSelectProps = {
  children: ReactNode;
  className?: string | undefined;
  inert?: boolean | undefined;
  /**
   * 이 시간(ms) 넘게 가만히 누르고 있다가 움직이면 쓸기로 보지 않음(길게 눌러 끌기에 넘김)
   * 길게 눌러 끄는 기능이 없는 목록은 비워 둠
   */
  yieldToLongPressMs?: number | undefined;
};

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  startPhotoId: string;
  /** 시작한 사진이 길게 눌러 끌 수 있는 사진인지 */
  startDraggable: boolean;
  /** 누른 순간 목록이 스크롤 중이었는지(관성 스크롤을 멈추려고 댄 터치는 선택이 아님) */
  scrolling: boolean;
  /** 쓸기가 시작된 뒤에만 값이 있음 */
  sweep?:
    | {
        /** 화면에 보이는 순서대로 늘어놓은 사진 id와 그 위치 */
        ids: readonly string[];
        indexById: ReadonlyMap<string, number>;
        anchor: number;
        /** 쓸기를 시작할 때의 선택 */
        initial: ReadonlySet<string>;
        /** 범위 안 사진을 고를지(true) 풀지(false) */
        target: boolean;
        /** 지금까지 손댄 사진마다 이번 쓸기가 원하는 상태 */
        desired: Map<string, boolean>;
        /** 마지막으로 손가락이 있던 사진의 위치(사진 밖에서는 직전 값 유지) */
        current: number;
        /** 토글을 요청하고 선택이 바뀌기를 기다리는 중 */
        waiting: boolean;
        /** 손가락의 마지막 위치(가장자리 자동 스크롤 중에는 손가락이 멈춰 있어도 그 아래 사진이 바뀜) */
        pointerX: number;
        pointerY: number;
      }
    | undefined;
};

// 위·아래 가장자리에서 이만큼 안쪽에 들어오면 스크롤을 시작하고, 깊이 들어갈수록 빨라져 가장 끝에서 프레임당 MAX만큼 감
const EDGE_ZONE_PX = 80;
const MAX_SCROLL_PX_PER_FRAME = 12;

/** 사진 목록을 스크롤하는 가장 가까운 조상(세로 스크롤이 실제로 가능한 것) */
const findScroller = (element: HTMLElement | null): HTMLElement | undefined => {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return undefined;
};

const photoElementAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>(`[${PHOTO_ID_ATTRIBUTE}]`) ?? undefined;

const photoIdAt = (x: number, y: number) =>
  photoElementAt(x, y)?.getAttribute(PHOTO_ID_ATTRIBUTE) ?? undefined;

/**
 * 선택 모드에서 사진 위를 쓸어 여러 장을 한 번에 고르거나 푸는 영역(사진함·번들 만들기 공통)
 * 애플 사진처럼 시작한 사진부터 손가락이 있는 사진까지(화면 순서, 줄을 넘어가도 이어짐)가 하나의 범위가 됨
 * 시작한 사진이 선택 전이면 범위를 모두 고르고, 선택돼 있으면 모두 풂. 같은 방향으로 가면 늘고 되돌아오면 줄며 벗어난 사진은 원래대로 돌아감
 * 손가락은 가로로 먼저 움직일 때만 쓸기로 보고, 세로로 먼저 움직이면 스크롤로 넘김(쓸기가 시작되면 스크롤은 멈춤)
 * 토글이 현재 선택을 기준으로 계산되므로 한 번에 한 장씩, 선택이 바뀔 때마다 다음 장을 이어서 처리
 */
export function PhotoDragSelect({
  children,
  className,
  inert,
  yieldToLongPressMs,
}: PhotoDragSelectProps) {
  const { active, selection, onToggle } = usePhotoSelection();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef(selection);
  const onToggleRef = useRef(onToggle);
  const gestureRef = useRef<Gesture | undefined>(undefined);
  // 쓸기가 끝난 직후 따라오는 클릭이 사진을 다시 토글하지 않게 한 번 막음
  const suppressClickRef = useRef(false);

  const frameRef = useRef<number | undefined>(undefined);

  // 목록이 마지막으로 스크롤된 시각(관성 스크롤 중 터치를 선택으로 오인하지 않기 위함)
  const lastScrollAtRef = useRef(0);
  const watchedScrollerRef = useRef<HTMLElement | undefined>(undefined);
  // 등록한 것과 해제하는 함수가 같은 참조여야 리스너가 지워지므로 렌더마다 새로 만들지 않음
  const handleScroll = useCallback(() => {
    lastScrollAtRef.current = Date.now();
  }, []);
  const watchScroller = useCallback(
    (scroller: HTMLElement | undefined) => {
      if (watchedScrollerRef.current === scroller) return;
      watchedScrollerRef.current?.removeEventListener('scroll', handleScroll);
      scroller?.addEventListener('scroll', handleScroll, { passive: true });
      watchedScrollerRef.current = scroller;
    },
    [handleScroll],
  );
  // 첫 터치가 관성 스크롤 중이어도 막을 수 있도록 마운트 때부터 감시하고, 목록이 나중에 길어지는 경우를 위해 누를 때도 다시 찾음
  useEffect(() => {
    watchScroller(findScroller(containerRef.current));
    return () => watchScroller(undefined);
  }, [watchScroller]);

  const stopAutoScroll = () => {
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = undefined;
  };
  useEffect(() => stopAutoScroll, []);

  // 손가락 아래 사진을 다시 찾아 범위를 갱신(손가락이 움직였거나 자동 스크롤로 사진이 밀렸을 때)
  const refreshRange = (sweep: NonNullable<Gesture['sweep']>) => {
    const id = photoIdAt(sweep.pointerX, sweep.pointerY);
    const index = id === undefined ? undefined : sweep.indexById.get(id);
    if (index !== undefined) sweep.current = index;
    desiredStates(
      sweep.desired,
      sweep.ids,
      sweep.initial,
      sweep.target,
      sweep.anchor,
      sweep.current,
    );
    flush();
  };

  // 쓰는 동안 손가락이 보이는 영역의 위·아래 가장자리에 있으면 그쪽으로 천천히 스크롤
  const startAutoScroll = () => {
    const scroller = findScroller(containerRef.current);
    if (!scroller) return;
    const tick = () => {
      const sweep = gestureRef.current?.sweep;
      if (!sweep) {
        frameRef.current = undefined;
        return;
      }
      const rect = scroller.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      let speed = 0;
      if (sweep.pointerY < top + EDGE_ZONE_PX) {
        speed = -Math.min(1, (top + EDGE_ZONE_PX - sweep.pointerY) / EDGE_ZONE_PX);
      } else if (sweep.pointerY > bottom - EDGE_ZONE_PX) {
        speed = Math.min(1, (sweep.pointerY - (bottom - EDGE_ZONE_PX)) / EDGE_ZONE_PX);
      }
      if (speed !== 0) {
        const before = scroller.scrollTop;
        // 일부 기기는 scrollTop을 정수로 맞추므로 한 프레임에 최소 1px은 움직임
        const step =
          Math.sign(speed) * Math.max(1, Math.round(Math.abs(speed) * MAX_SCROLL_PX_PER_FRAME));
        scroller.scrollTop = before + step;
        if (scroller.scrollTop !== before) refreshRange(sweep);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const flush = () => {
    const sweep = gestureRef.current?.sweep;
    if (!sweep || sweep.waiting) return;
    const id = nextToggle(sweep.desired, selectionRef.current, sweep.indexById, sweep.anchor);
    if (id === undefined) return;
    // 선택이 바뀌어야 다음 장으로 넘어감(최대 장수 거절처럼 바뀌지 않으면 이번 쓸기는 거기서 멈춤)
    sweep.waiting = true;
    onToggleRef.current(id);
  };

  // 토글 함수를 ref에 담아 두어 effect·타이머 안에서도 최신 함수를 부름
  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  // 선택이 바뀌면 기다리던 토글이 반영된 것이므로 다음 장을 처리
  useEffect(() => {
    selectionRef.current = selection;
    const sweep = gestureRef.current?.sweep;
    if (sweep) sweep.waiting = false;
    flush();
    // flush는 ref만 읽으므로 선택이 바뀔 때만 다시 돌림(다른 이유의 리렌더로 대기가 풀려 같은 선택 기준으로 토글이 겹치지 않게 함)
  }, [selection]);

  // 쓰는 동안 화면이 같이 스크롤되지 않게 함(passive가 아닌 native 리스너여야 preventDefault가 먹음)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleTouchMove = (event: TouchEvent) => {
      if (gestureRef.current?.sweep && event.cancelable) event.preventDefault();
    };
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => container.removeEventListener('touchmove', handleTouchMove);
  }, []);

  // 포인터가 이미 처리한 동작 뒤에 따라오는 클릭을 막는 시간(터치는 손가락을 뗀 뒤 클릭이 별도 작업으로 오므로 0ms로는 부족함)
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressNextClick = () => {
    clearTimeout(suppressTimerRef.current);
    suppressClickRef.current = true;
    suppressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
    }, CLICK_SUPPRESS_MS);
  };
  useEffect(() => () => clearTimeout(suppressTimerRef.current), []);

  const end = () => {
    stopAutoScroll();
    if (gestureRef.current?.sweep) suppressNextClick();
    gestureRef.current = undefined;
  };

  /**
   * 거의 움직이지 않고 뗀 탭은 클릭이 아니라 처음 닿은 사진으로 처리
   * 브라우저는 클릭을 손가락을 뗀 위치의 요소로 보내서, 칸 경계 근처를 누르다 조금만 미끄러져도 옆 사진이 토글됐음(사진 칸 사이 간격이 1px)
   * 길게 눌러 끌 수 있는 사진을 오래 눌렀다 떼면 끌기 쪽이 처리하므로 넘김
   */
  // 길게 눌러 끌 수 있는 사진을 오래(끌기 시작 직전 포함) 누르고 있었는지
  const isHeldLong = (gesture: Gesture) =>
    gesture.startDraggable &&
    yieldToLongPressMs !== undefined &&
    Date.now() - gesture.startTime >= yieldToLongPressMs - LONG_PRESS_MARGIN_MS;

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const moved = gesture
      ? Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
      : 0;
    const tap =
      gesture &&
      !gesture.sweep &&
      event.pointerId === gesture.pointerId &&
      moved < START_DISTANCE_PX &&
      !isHeldLong(gesture)
        ? gesture
        : undefined;
    // 스크롤 중에 댄 터치는 선택하지 않고, 브라우저가 클릭을 보내더라도 막음
    const scrollingTap = tap?.scrolling === true;
    const tapPhotoId = tap && !tap.scrolling ? tap.startPhotoId : undefined;
    end();
    if (scrollingTap) suppressNextClick();
    if (tapPhotoId === undefined) return;
    suppressNextClick();
    onToggleRef.current(tapPhotoId);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || !event.isPrimary || event.button !== 0) return;
    // 새로 누르면 이전 동작의 클릭 억제는 끝냄
    clearTimeout(suppressTimerRef.current);
    suppressClickRef.current = false;
    const startElement = photoElementAt(event.clientX, event.clientY);
    const startPhotoId = startElement?.getAttribute(PHOTO_ID_ATTRIBUTE);
    if (!startElement || !startPhotoId) return;
    watchScroller(findScroller(containerRef.current));
    const scrolling = Date.now() - lastScrollAtRef.current < SCROLL_SETTLE_MS;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      startPhotoId,
      startDraggable: startElement.closest(`[${PHOTO_DRAGGABLE_ATTRIBUTE}]`) !== null,
      scrolling,
      sweep: undefined,
    };
  };

  const beginSweep = (gesture: Gesture) => {
    const container = containerRef.current;
    if (!container) return false;
    const ids = [...container.querySelectorAll<HTMLElement>(`[${PHOTO_ID_ATTRIBUTE}]`)].map(
      (element) => element.getAttribute(PHOTO_ID_ATTRIBUTE) ?? '',
    );
    const indexById = new Map(ids.map((id, index) => [id, index]));
    const anchor = indexById.get(gesture.startPhotoId);
    if (anchor === undefined) return false;
    gesture.sweep = {
      ids,
      indexById,
      anchor,
      initial: new Set(selectionRef.current),
      target: !selectionRef.current.includes(gesture.startPhotoId),
      desired: new Map(),
      current: anchor,
      waiting: false,
      pointerX: gesture.startX,
      pointerY: gesture.startY,
    };
    startAutoScroll();
    return true;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    // 마우스 버튼을 영역 밖에서 놓으면 pointerup이 오지 않으므로 버튼이 떼진 채 움직이면 쓸기를 끝냄
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      end();
      return;
    }

    if (!gesture.sweep) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.hypot(dx, dy) < START_DISTANCE_PX) return;
      // 오래 누른 뒤 움직이면 길게 눌러 끌기에 넘기되, 끌 수 없는 사진은 넘길 곳이 없으니 계속 쓸기로 봄(위치를 잡느라 멈췄다가 쓰는 일이 흔함)
      const heldTooLong = isHeldLong(gesture);
      // 손가락은 가로로 먼저 움직일 때만 쓸기(세로는 스크롤), 마우스는 어느 방향이든 쓸기
      const wrongDirection = event.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx);
      if (heldTooLong || wrongDirection || !beginSweep(gesture)) {
        gestureRef.current = undefined;
        return;
      }
    }

    const sweep = gesture.sweep;
    if (!sweep) return;
    sweep.pointerX = event.clientX;
    sweep.pointerY = event.clientY;
    refreshRange(sweep);
  };

  // 쓸기 직후 이어지는 클릭(같은 사진 위에서 뗐을 때)이 방금 처리한 사진을 되돌리지 않게 막음
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className={className}
      inert={inert}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={end}
      onClickCapture={handleClickCapture}
      // 마우스로 쓸 때 사진이 브라우저 기본 끌기로 끌려가며 쓸기가 끊기지 않게 함
      onDragStart={(event) => {
        if (gestureRef.current) event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

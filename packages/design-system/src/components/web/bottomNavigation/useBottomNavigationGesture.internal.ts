import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { ARRIVE_MS, HELD_SCALE, prefersReducedMotion, settlePill } from './pillMotion.internal';

// 탭과 끌기를 구분하는 최소 이동 거리(px)
const SCRUB_THRESHOLD = 6;

type Params = { itemCount: number; selectedIndex: number };

/** 항목 요소의 click 경로를 공유하는 끌기 선택·모션 처리 */
export const useBottomNavigationGesture = ({ itemCount, selectedIndex }: Params) => {
  const listRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const press = useRef<{ id: number; startX: number } | null>(null);
  const canSuppressClick = useRef(false);
  const [scrub, setScrub] = useState<{ px: number; index: number } | null>(null);
  const [isSelectedHeld, setIsSelectedHeld] = useState(false);

  // 새 항목의 한 프레임 깜빡임 방지를 위한 렌더 중 이전 선택 유지
  const [lag, setLag] = useState<{ sel: number; from: number | null }>({
    sel: selectedIndex,
    from: null,
  });
  // 끌기 종료 시 이미 도착한 알약의 활성 전환 지연 생략
  const [canSkipLag, setCanSkipLag] = useState(false);
  if (lag.sel !== selectedIndex) {
    const hasMoved = lag.sel >= 0 && selectedIndex >= 0;
    setLag({
      sel: selectedIndex,
      from: hasMoved && !canSkipLag && !prefersReducedMotion() ? lag.sel : null,
    });
    setCanSkipLag(false);
  }
  useEffect(() => {
    if (lag.from === null) return;
    const timer = window.setTimeout(() => setLag((value) => ({ ...value, from: null })), ARRIVE_MS);
    return () => window.clearTimeout(timer);
  }, [lag]);

  // 첫 렌더를 제외한 선택 변경에 마무리 모션 적용
  const prevIndex = useRef(selectedIndex);
  // 놓는 순간 크기가 튀지 않도록 누름 배율 유지
  const isReleasedEnlarged = useRef(false);
  useEffect(() => {
    const prev = prevIndex.current;
    const hasMoved = prev !== selectedIndex && prev >= 0 && selectedIndex >= 0;
    const isEnlarged = isReleasedEnlarged.current;
    isReleasedEnlarged.current = false;
    prevIndex.current = selectedIndex;
    if (hasMoved) settlePill(pillRef.current, isEnlarged ? HELD_SCALE : 1);
  }, [selectedIndex]);

  const locate = (clientX: number) => {
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || itemCount === 0) return null;
    const slot = rect.width / itemCount;
    const px = Math.min(Math.max(clientX - rect.left - slot / 2, 0), rect.width - slot);
    const index = Math.min(Math.max(Math.floor((clientX - rect.left) / slot), 0), itemCount - 1);
    return { px, index };
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (press.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    press.current = { id: event.pointerId, startX: event.clientX };
    setIsSelectedHeld(locate(event.clientX)?.index === selectedIndex);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    if (!scrub && Math.abs(event.clientX - current.startX) < SCRUB_THRESHOLD) return;
    const at = locate(event.clientX);
    if (!at) return;
    if (!scrub) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 포인터 캡처 미지원 시 막대 내부 이동으로 제한
      }
    }
    setScrub(at);
  };

  const finishPress = (event: PointerEvent<HTMLElement>, isCommitted: boolean) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = null;
    const at = locate(event.clientX);
    // 선택 변경 시 effect에서 마무리 모션 처리
    const hasSelectionChange = isCommitted && !!scrub && at?.index !== selectedIndex;
    isReleasedEnlarged.current = hasSelectionChange;
    setCanSkipLag(hasSelectionChange);
    if ((isSelectedHeld || scrub) && !hasSelectionChange) settlePill(pillRef.current, HELD_SCALE);
    setIsSelectedHeld(false);
    if (!scrub) return;
    setScrub(null);
    if (hasSelectionChange && at) {
      listRef.current?.children[at.index]?.querySelector<HTMLElement>('button, a')?.click();
    }
    // 끌기 종료 직후 브라우저 click에 의한 중복 선택 방지
    canSuppressClick.current = true;
    window.setTimeout(() => {
      canSuppressClick.current = false;
    }, 50);
  };

  return {
    listRef,
    pillRef,
    scrub,
    /** 실제 선택(aria-current)과 분리된 미리보기 항목 */
    visualIndex: scrub ? scrub.index : (lag.from ?? selectedIndex),
    isEnlarged: !!scrub || isSelectedHeld,
    navProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finishPress(event, true),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finishPress(event, false),
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        if (scrub || press.current?.id !== event.pointerId) return;
        press.current = null;
        setIsSelectedHeld(false);
      },
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        if (!canSuppressClick.current) return;
        event.stopPropagation();
        event.preventDefault();
      },
    },
  };
};

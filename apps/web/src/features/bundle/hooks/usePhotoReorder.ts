'use client';

import {
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEffect, useRef, useState } from 'react';
import { ADD_CARD_ID, LONG_PRESS_MS, LONG_PRESS_TOLERANCE_PX } from '../constants/photoList';

type UsePhotoReorderOptions = {
  /** 지금 순서대로의 사진 id */
  photoIds: readonly string[];
  /** 끌어서 놓았을 때 옮길 자리(`toIndex`는 놓인 사진의 자리) */
  onMove: (_photoId: string, _toIndex: number) => void;
  /**
   * 끌기가 시작되거나 끝났을 때(놓기·취소·앱 백그라운드·화면 이탈 포함, 상태가 바뀔 때만 한 번씩)
   * 끄는 동안의 작업 중 표시와 다른 멤버 변경 미루기에 씀. 시작할 때는 끌기 시작한 사진의 id도 함께 줌
   */
  onDragStateChange?: ((_dragging: boolean, _photoId?: string) => void) | undefined;
};

/**
 * 길게 눌러 끌어 순서 바꾸기(기능 spec 4.3.6, 결정 기록 016): 500ms 길게 누르면 떠오르고 놓을 때 한 번만 옮김
 * 「사진 추가」 칸에 놓으면 맨 뒤 사진 자리로 옮김(칸 뒤로는 못 옮김)
 * 끄는 동안 상태(스크롤 스냅 끄기용), 앱이 백그라운드로 가면 끌던 사진을 놓은 것으로 보고 끌기 영역을 새로 만드는 epoch를 맡음
 */
export function usePhotoReorder({ photoIds, onMove, onDragStateChange }: UsePhotoReorderOptions) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
  );
  // 앱이 백그라운드로 가면 끌던 사진을 놓은 것으로 보고 끌기 영역을 새로 만듦
  const [dragEpoch, setDragEpoch] = useState(0);
  // 끄는 동안은 스크롤 스냅을 꺼서 자동 스크롤이 사진 단위로 튀지 않게 함
  const [dragging, setDraggingState] = useState(false);
  const draggingRef = useRef(false);
  const stateChange = useRef(onDragStateChange);
  useEffect(() => {
    stateChange.current = onDragStateChange;
  });

  // 끌기 상태를 바꾸고 실제로 바뀐 때만 알림(놓기와 취소가 겹쳐 들어와도 한 번만)
  const setDragging = (next: boolean, photoId?: string) => {
    setDraggingState(next);
    if (draggingRef.current === next) return;
    draggingRef.current = next;
    // 사진 id는 끌기 시작 때만 있음(끝날 때는 두 번째 인자를 넘기지 않음)
    if (photoId === undefined) stateChange.current?.(next);
    else stateChange.current?.(next, photoId);
  };
  const setDraggingRef = useRef(setDragging);
  useEffect(() => {
    setDraggingRef.current = setDragging;
  });

  useEffect(() => {
    const cancelDrag = () => {
      if (document.visibilityState === 'hidden') {
        setDragEpoch((epoch) => epoch + 1);
        setDraggingRef.current(false);
      }
    };
    document.addEventListener('visibilitychange', cancelDrag);
    return () => document.removeEventListener('visibilitychange', cancelDrag);
  }, []);

  // 끌던 중 화면이 사라져도(이동·연결 끊김) 작업 중 표시와 변경 미루기가 남지 않게 풂
  useEffect(
    () => () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      stateChange.current?.(false);
    },
    [],
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    if (!over || active.id === over.id) return;
    const from = photoIds.indexOf(String(active.id));
    const to = over.id === ADD_CARD_ID ? photoIds.length - 1 : photoIds.indexOf(String(over.id));
    if (from < 0 || to < 0 || from === to) return;
    onMove(String(active.id), to);
  };

  return {
    sensors,
    dragEpoch,
    dragging,
    onDragStart: (event?: DragStartEvent) =>
      setDragging(true, event === undefined ? undefined : String(event.active.id)),
    onDragEnd,
    onDragCancel: () => setDragging(false),
  };
}

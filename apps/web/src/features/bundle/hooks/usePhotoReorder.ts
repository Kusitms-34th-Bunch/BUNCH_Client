'use client';

import { type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { LONG_PRESS_MS, LONG_PRESS_TOLERANCE_PX } from '../constants/photoList';

type UsePhotoReorderOptions = {
  /** 지금 순서대로의 사진 id */
  photoIds: readonly string[];
  /** 끌어서 놓았을 때 옮길 자리(`toIndex`는 놓인 사진의 자리) */
  onMove: (_photoId: string, _toIndex: number) => void;
};

/**
 * 길게 눌러 끌어 순서 바꾸기(기능 spec 4.3.5, 결정 기록 016). 사진 목록 화면이 없어져 지금 쓰는 곳은 없고, 작성 화면 썸네일의 순서 바꾸기 이슈에서 이어 씀: 500ms 길게 누르면 떠오르고 놓을 때 한 번만 옮김
 * 끄는 동안 상태(스크롤 스냅 끄기용), 앱이 백그라운드로 가면 끌던 사진을 놓은 것으로 보고 끌기 영역을 새로 만드는 epoch를 맡음
 */
export function usePhotoReorder({ photoIds, onMove }: UsePhotoReorderOptions) {
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
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const cancelDrag = () => {
      if (document.visibilityState === 'hidden') {
        setDragEpoch((epoch) => epoch + 1);
        setDragging(false);
      }
    };
    document.addEventListener('visibilitychange', cancelDrag);
    return () => document.removeEventListener('visibilitychange', cancelDrag);
  }, []);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    if (!over || active.id === over.id) return;
    const to = photoIds.indexOf(String(over.id));
    if (to >= 0) onMove(String(active.id), to);
  };

  return {
    sensors,
    dragEpoch,
    dragging,
    onDragStart: () => setDragging(true),
    onDragEnd,
    onDragCancel: () => setDragging(false),
  };
}

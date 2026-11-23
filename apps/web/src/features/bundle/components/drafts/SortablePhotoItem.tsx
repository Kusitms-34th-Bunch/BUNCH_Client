'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { LONG_PRESS_MS } from '../../constants/photoList';

type SortablePhotoItemProps = {
  id: string;
  disabled: boolean | { draggable?: boolean; droppable?: boolean };
  /** 끌 수 없는 사람이 길게 눌렀을 때(끌기와 같은 시간을 누르면 한 번 호출, 이어지는 눌림 해제의 클릭은 막음) */
  onLockedPress?: (() => void) | undefined;
  children: ReactNode;
};

/** 사진 한 칸: 길게 눌러 끄는 정렬 항목(키보드 끌기는 쓰지 않아 `attributes`는 붙이지 않음) */
export function SortablePhotoItem({
  id,
  disabled,
  onLockedPress,
  children,
}: SortablePhotoItemProps) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  // 끌 수 없는 사람의 길게 누르기: 끌기 센서가 꺼져 있어 같은 시간(500ms)을 직접 재서 안내
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressed = useRef(false);
  const clearPress = () => clearTimeout(pressTimer.current);
  useEffect(() => clearPress, []);
  const style: CSSProperties = {
    // 좌우로만 움직이고 크기는 바꾸지 않음
    transform: transform
      ? CSS.Translate.toString({ x: transform.x, y: 0, scaleX: 1, scaleY: 1 })
      : undefined,
    transition,
    // 끄는 사진은 이웃 사진 위로 올라옴
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      data-photo-id={id}
      style={style}
      {...listeners}
      {...(onLockedPress && {
        onPointerDown: () => {
          clearPress();
          pressed.current = false;
          pressTimer.current = setTimeout(() => {
            pressed.current = true;
            onLockedPress();
          }, LONG_PRESS_MS);
        },
        onPointerUp: clearPress,
        onPointerCancel: clearPress,
        onPointerLeave: clearPress,
        // 안내가 뜬 길게 누르기 뒤에 손을 떼며 생기는 클릭(사진 열기·삭제)은 막음
        onClickCapture: (event: ReactMouseEvent) => {
          if (!pressed.current) return;
          pressed.current = false;
          event.preventDefault();
          event.stopPropagation();
        },
      })}
      // 떠오른 사진은 살짝 커짐(기능 spec 4.3.6 「살짝 커지며」, 105%)
      className={isDragging ? 'relative shrink-0 scale-105' : 'relative shrink-0'}
    >
      {children}
    </li>
  );
}

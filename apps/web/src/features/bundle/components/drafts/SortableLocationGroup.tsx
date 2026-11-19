'use client';

import { LineMenuSmallIcon } from '@app/design-system';
import { SelectionFieldGroup, type SelectionFieldGroupProps } from '@app/design-system/web';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { BUNDLE_MESSAGES } from '../../constants/messages';

// 행 안의 핸들이 그 행의 정렬 동작(잡는 곳·속성)을 받도록 래퍼가 제공하는 값
type HandleValue = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'setActivatorNodeRef'
>;
const HandleContext = createContext<HandleValue | null>(null);

type SortableRowProps = {
  id: string;
  disabled: boolean;
  children: React.ReactNode;
};

/** 위치 한 줄: 위아래로만 움직이는 정렬 항목. 잡는 곳은 행 안의 햄버거 핸들뿐 */
function SortableRow({ id, disabled, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style: CSSProperties = {
    // 세로로만 움직이고 크기는 바꾸지 않음
    transform: transform
      ? CSS.Translate.toString({ x: 0, y: transform.y, scaleX: 1, scaleY: 1 })
      : undefined,
    transition,
    // 끄는 줄은 이웃 줄 위로 올라와 그림자 없이도 구분됨
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    </HandleContext.Provider>
  );
}

type LocationHandleProps = {
  label: string;
  /** 끌 수 없는 상태(장소가 하나뿐이거나 편집 중·권한 없음)에서 눌렀을 때 */
  onBlockedPress: (() => void) | undefined;
};

/**
 * 햄버거 핸들: 보이는 16px보다 넓은 32px 터치 영역
 * 끌 수 없는 상태는 `useSortable({ disabled })`가 붙이는 `aria-disabled`로 알림(`disabled` 속성이 아니라 포커스를 유지)
 */
function LocationHandle({ label, onBlockedPress }: LocationHandleProps) {
  const handle = useContext(HandleContext);

  return (
    <button
      type="button"
      ref={handle?.setActivatorNodeRef}
      aria-label={label}
      onClick={onBlockedPress}
      {...handle?.attributes}
      {...handle?.listeners}
      // 정렬 핸들은 누르면 켜지는 토글이 아니라 잡는 손잡이라 dnd-kit이 붙이는 aria-pressed는 뺌
      aria-pressed={undefined}
      className="text-icon-primary focus-visible:outline-border-brand relative z-10 -m-2 flex cursor-grab touch-none items-center justify-center p-2 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <LineMenuSmallIcon aria-hidden="true" />
    </button>
  );
}

type SortableLocationGroupProps = Omit<SelectionFieldGroupProps, 'itemHandle' | 'itemWrapper'> & {
  /** 줄을 잡거나 놓거나 취소했을 때(작업 중 표시용: 시작·끝만 알리고 움직임은 알리지 않음) */
  onDragStateChange?: ((_id: string, _dragging: boolean) => void) | undefined;
  /** 끌어서 순서를 바꿨을 때(자리는 0부터) */
  onMove: (_id: string, _toIndex: number, _overId: string) => void;
  /** 순서를 못 바꾸는 상태(하나뿐이거나 편집 중·권한 없음) */
  disabled: boolean;
  /** 못 바꾸는 상태에서 핸들을 눌렀을 때 이유 안내(없으면 아무 일 없음) */
  onBlockedPress?: (() => void) | undefined;
};

/**
 * 위치 그룹: 값을 고른 뒤에는 제목 앞 아이콘이 햄버거로 바뀌고, 그 핸들을 잡아 끌어 순서를 바꿈(Figma `5367:146358`)
 * 마우스·터치로 끌거나, 핸들에 포커스를 두고 Space로 잡아 방향키로 옮긴 뒤 Space로 놓음(Esc 취소)
 */
export function SortableLocationGroup({
  items,
  onMove,
  disabled,
  onBlockedPress,
  onDragStateChange,
  ...group
}: SortableLocationGroupProps) {
  // 끌기 도중 화면이 사라져도(연결 끊김·이동) 작업 중 표시가 남지 않도록 끌고 있는 줄을 기억해 둠
  const dragging = useRef(new Set<string>());
  const stateChange = useRef(onDragStateChange);
  useEffect(() => {
    stateChange.current = onDragStateChange;
  });
  useEffect(() => {
    const active = dragging.current;
    return () => {
      for (const id of active) stateChange.current?.(id, false);
      active.clear();
    };
  }, []);
  const notifyDrag = (id: string, isDragging: boolean) => {
    if (isDragging) dragging.current.add(id);
    else dragging.current.delete(id);
    onDragStateChange?.(id, isDragging);
  };

  const sensors = useSensors(
    // 스크롤과 구분하려고 핸들을 조금 움직여야 시작
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // 끄는 동안 다른 멤버의 변경은 미뤘다가 손을 뗄 때 한 번에 반영(기능 spec 4.3.10 로직 8): 잡은 순간의 목록을 놓을 때까지 그림
  const [frozen, setFrozen] = useState<typeof items | null>(null);
  const shown = frozen ?? items;
  const nameOf = (id: string | number) => shown.find((item) => item.id === id)?.value ?? '';
  const indexOf = (id: string | number) => shown.findIndex((item) => item.id === id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    notifyDrag(String(active.id), false);
    setFrozen(null);
    if (!over || active.id === over.id) return;
    // 자리 번호는 화면(잡은 순간의 목록) 기준이라, 놓은 줄의 id도 함께 넘겨 최신 목록에서 다시 구하게 함
    onMove(String(active.id), indexOf(over.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => {
        // 손잡이로 집어 올린 순간 한 번 진동(사진 끌기와 같은 햅틱, Figma 햅틱 모음). 쉘이 아니거나 이전 쉘이면 동작 없음
        if (isNativeShell()) void appBridge.dragStartHaptic().catch(() => {});
        setFrozen(items);
        notifyDrag(String(active.id), true);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={({ active }) => {
        setFrozen(null);
        notifyDrag(String(active.id), false);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: BUNDLE_MESSAGES.locationDragInstructions },
        announcements: {
          onDragStart: ({ active }) => BUNDLE_MESSAGES.locationDragStart(nameOf(active.id)),
          onDragOver: ({ over }) =>
            over ? BUNDLE_MESSAGES.locationDragOver(indexOf(over.id) + 1, shown.length) : undefined,
          onDragEnd: ({ over }) =>
            over
              ? BUNDLE_MESSAGES.locationDragEnd(indexOf(over.id) + 1, shown.length)
              : BUNDLE_MESSAGES.locationDragCancel,
          onDragCancel: () => BUNDLE_MESSAGES.locationDragCancel,
        },
      }}
    >
      <SortableContext items={shown.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <SelectionFieldGroup
          {...group}
          items={shown}
          itemHandle={(item) => (
            <LocationHandle
              label={BUNDLE_MESSAGES.locationReorderLabel(item.value)}
              onBlockedPress={disabled ? onBlockedPress : undefined}
            />
          )}
          itemWrapper={(item, _index, row) => (
            <SortableRow id={item.id} disabled={disabled}>
              {row}
            </SortableRow>
          )}
        />
      </SortableContext>
    </DndContext>
  );
}

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
import { createContext, useContext, type CSSProperties } from 'react';
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

/** 햄버거 핸들: 보이는 16px보다 넓은 32px 터치 영역 */
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

type SortableLocationGroupProps = Omit<
  SelectionFieldGroupProps,
  'itemHandle' | 'itemWrapper' | 'onItemClick'
> & {
  /** 끌어서 순서를 바꿨을 때(자리는 0부터) */
  onMove: (_id: string, _toIndex: number) => void;
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
  ...group
}: SortableLocationGroupProps) {
  const sensors = useSensors(
    // 스크롤과 구분하려고 핸들을 조금 움직여야 시작
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nameOf = (id: string | number) => items.find((item) => item.id === id)?.value ?? '';
  const indexOf = (id: string | number) => items.findIndex((item) => item.id === id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onMove(String(active.id), indexOf(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: BUNDLE_MESSAGES.locationDragInstructions },
        announcements: {
          onDragStart: ({ active }) => BUNDLE_MESSAGES.locationDragStart(nameOf(active.id)),
          onDragOver: ({ over }) =>
            over ? BUNDLE_MESSAGES.locationDragOver(indexOf(over.id) + 1, items.length) : undefined,
          onDragEnd: ({ over }) =>
            over
              ? BUNDLE_MESSAGES.locationDragEnd(indexOf(over.id) + 1, items.length)
              : BUNDLE_MESSAGES.locationDragCancel,
          onDragCancel: () => BUNDLE_MESSAGES.locationDragCancel,
        },
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <SelectionFieldGroup
          {...group}
          items={items}
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

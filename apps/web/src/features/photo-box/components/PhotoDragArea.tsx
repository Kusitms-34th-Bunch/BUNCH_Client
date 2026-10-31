'use client';

import { toast } from '@app/design-system';
import { PhotoThumbnail } from '@app/design-system/web';
import {
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import type { PhotoSection } from '../lib/photoDate';
import type { PhotoBoxActions, PhotoBoxViewer } from '../lib/types';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import {
  type SectionItems,
  canDragPhoto,
  dateFromKey,
  findSectionKey,
  moveItem,
  needsDragConfirm,
  toSectionItems,
} from '../lib/photoDrag';
import { PhotoDateSection } from './PhotoDateSection';
import { PhotoDragProvider } from './PhotoDragContext';
import { DateChangeConfirmDialog } from './PhotoSelectionDialogs';

// 길게 누르기: 이만큼 누르고 있어야 끌기가 시작되고, 그 전에 움직이면 스크롤로 넘김(짧게 누르면 선택·해제)
const LONG_PRESS_MS = 300;
const LONG_PRESS_TOLERANCE_PX = 8;

// 섹션 한가운데뿐 아니라 제목·빈 칸 위에서도 그 섹션으로 보도록 포인터가 들어 있는 영역을 먼저 보고, 없으면 가장 가까운 곳
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};

// 요청이 도는 동안 끌 수 있는 사진이 없다는 값(참조를 고정해 context 값이 불필요하게 바뀌지 않게 함)
const NO_DRAGGABLE: ReadonlySet<string> = new Set();

type Move = { photoId: string; fromKey: string; toKey: string };

type PhotoDragAreaProps = {
  sections: readonly PhotoSection[];
  viewer: PhotoBoxViewer;
  actions: PhotoBoxActions;
  /** 선택 모드이고 저장·삭제·날짜 변경이 돌고 있지 않을 때만 끌 수 있음 */
  enabled: boolean;
  /** 날짜 변경 요청이 도는 동안 true(메뉴·저장·삭제도 함께 막도록 화면이 받음) */
  onMovingChange?: ((_moving: boolean) => void) | undefined;
};

/**
 * 선택 모드에서 사진을 길게 눌러 다른 날짜 섹션으로 끌어 옮기는 영역
 * 끄는 동안은 섹션별 순서만 미리 바꿔 주변 사진이 비켜 자리를 보여 주고, 놓으면 그 섹션 날짜로 바꿈
 * 이미 있는 섹션으로만 옮길 수 있고(원래 섹션·섹션 밖은 변경 없음), 실패하면 원래 자리로 돌려 오류 토스트를 띄움
 * 키보드·스크린 리더용 대체 경로는 선택 모드의 날짜 바꾸기 시트이고, 키보드 센서는 두지 않음
 */
export function PhotoDragArea({
  sections,
  viewer,
  actions,
  enabled,
  onMovingChange,
}: PhotoDragAreaProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
  );
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  // 끄는 동안과 날짜 변경 요청이 도는 동안만 값이 있는 미리보기 순서
  const [preview, setPreview] = useState<SectionItems | undefined>(undefined);
  // 관리자가 다른 멤버 사진을 놓았을 때 확인을 기다리는 이동(확인 창이 열려 있는 동안만 값이 있음)
  const [moveToConfirm, setMoveToConfirm] = useState<Move | undefined>(undefined);
  // 날짜 변경 요청이 도는 동안은 새로 끌지 못하게 막음(미리보기와 요청 결과가 엉키지 않도록)
  const [moving, setMoving] = useState(false);

  const photoById = useMemo(
    () => new Map(sections.flatMap((section) => section.photos).map((p) => [p.id, p])),
    [sections],
  );
  const draggableIds = useMemo(
    () =>
      new Set(
        [...photoById.values()].filter((p) => canDragPhoto(p, viewer)).map((photo) => photo.id),
      ),
    [photoById, viewer],
  );

  // 끄는 중에는 미리보기 순서대로 사진을 다시 늘어놓음
  const shownSections = useMemo(
    () =>
      preview
        ? sections.map((section) => ({
            ...section,
            photos: (preview[section.dateKey] ?? [])
              .map((id) => photoById.get(id))
              .filter((photo) => photo !== undefined),
          }))
        : sections,
    [sections, preview, photoById],
  );

  const reset = () => {
    setActiveId(undefined);
    setPreview(undefined);
    setMoveToConfirm(undefined);
  };

  // 선택 모드가 끝나거나 저장·삭제가 시작되어 끌 수 없게 되면 끌던 상태를 걷음
  const dragging = activeId !== undefined || preview !== undefined || moveToConfirm !== undefined;
  if (!enabled && !moving && dragging) reset();

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setPreview(toSectionItems(sections));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !preview) return;
    const photoId = String(active.id);
    const overId = String(over.id);
    const overIsSection = overId in preview;
    const targetKey = overIsSection ? overId : findSectionKey(preview, overId);
    if (targetKey === undefined) return;
    const list = preview[targetKey] ?? [];
    const index = overIsSection ? list.length : list.indexOf(overId);
    setPreview(moveItem(preview, photoId, targetKey, index));
  };

  const move = async (photoId: string, fromKey: string, toKey: string) => {
    setMoving(true);
    onMovingChange?.(true);
    try {
      await actions.changePhotoDates([photoId], dateFromKey(toKey));
    } catch {
      setMoving(false);
      onMovingChange?.(false);
      reset();
      toast(PHOTO_BOX_MESSAGES.dateChangeFailed, { fullWidth: true });
      return;
    }
    setMoving(false);
    onMovingChange?.(false);
    reset();
    toast(PHOTO_BOX_MESSAGES.dateChanged, {
      fullWidth: true,
      action: {
        label: PHOTO_BOX_MESSAGES.undo,
        onClick: () => {
          // 원래 날짜로 한 번 더 바꿔 되돌림(시각은 그대로라 같은 섹션의 원래 순서로 돌아옴)
          void actions
            .changePhotoDates([photoId], dateFromKey(fromKey))
            .catch(() => toast(PHOTO_BOX_MESSAGES.dateChangeFailed, { fullWidth: true }));
        },
      },
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const photoId = String(active.id);
    const fromKey = findSectionKey(toSectionItems(sections), photoId);
    const toKey = preview ? findSectionKey(preview, photoId) : undefined;
    setActiveId(undefined);
    // 원래 섹션이나 섹션 밖에 놓으면 아무것도 바꾸지 않음
    if (!over || fromKey === undefined || toKey === undefined || fromKey === toKey) {
      setPreview(undefined);
      return;
    }
    // 확인이 필요하면 놓은 자리에 둔 채 확인 창을 띄움
    const photo = photoById.get(photoId);
    if (photo && needsDragConfirm(photo, viewer)) {
      setMoveToConfirm({ photoId, fromKey, toKey });
      return;
    }
    // 요청이 도는 동안은 놓은 자리에 그대로 두었다가 결과가 오면 걷음
    void move(photoId, fromKey, toKey);
  };

  const activePhoto = activeId === undefined ? undefined : photoById.get(activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
      accessibility={{
        screenReaderInstructions: { draggable: '' },
        announcements: {
          onDragStart: () => '사진을 끌고 있어요.',
          onDragOver: () => undefined,
          onDragEnd: () => undefined,
          onDragCancel: () => '끌기를 취소했어요.',
        },
      }}
    >
      <PhotoDragProvider value={{ enabled, draggableIds: moving ? NO_DRAGGABLE : draggableIds }}>
        {shownSections.map((section) => (
          <PhotoDateSection key={section.dateKey} section={section} />
        ))}
      </PhotoDragProvider>
      <DateChangeConfirmDialog
        open={moveToConfirm !== undefined}
        // 「취소」와 Esc만 onClose로 오고(확인 버튼은 닫기 동작이 없음), 취소하면 놓은 자리를 걷고 원래 자리로 돌림
        onClose={reset}
        onConfirm={() => {
          const target = moveToConfirm;
          setMoveToConfirm(undefined);
          if (target) void move(target.photoId, target.fromKey, target.toKey);
        }}
      />
      <DragOverlay>
        {activePhoto ? (
          <PhotoThumbnail
            src={activePhoto.src}
            alt=""
            className="w-full opacity-70"
            selectionMode
            selected={false}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

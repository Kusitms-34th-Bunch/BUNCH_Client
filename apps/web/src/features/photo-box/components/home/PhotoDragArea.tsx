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
import { memo, useEffect } from 'react';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { PhotoSection } from '../../lib/photoDate';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxViewer } from '../../lib/types';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PhotoDragProvider } from '../../contexts/PhotoDragContext';
import { usePhotoSelectionActions } from '../../contexts/photoSelection';
import { usePhotoDragMove } from '../../hooks/usePhotoDragMove';
import { LONG_PRESS_MS } from '../../lib/dragSelect';
import { MissingPhotosError } from '../../lib/missingPhotos';
import { getDateConfirmKind } from '../../lib/photoActions';
import {
  canDragPhoto,
  dateFromKey,
  findSectionKey,
  isTapLikeDrag,
  moveItem,
  needsDragConfirm,
  toDragItems,
  UNDATED_SECTION_KEY,
} from '../../lib/photoDrag';
import { DateChangeConfirmDialog } from '../PhotoSelectionDialogs';
import { UndatedPhotos } from '../UndatedPhotos';
import { PhotoDateSection } from './PhotoDateSection';

// 길게 누르기 시간은 쓸어서 고르기와 나누어 쓰도록 공유(짧게 누르면 선택·해제)
const LONG_PRESS_TOLERANCE_PX = 8;

// 섹션 한가운데뿐 아니라 제목·빈 칸 위에서도 그 섹션으로 보도록 포인터가 들어 있는 영역을 먼저 보고, 없으면 가장 가까운 곳
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};

// 요청이 도는 동안 끌 수 있는 사진이 없다는 값(참조를 고정해 context 값이 불필요하게 바뀌지 않게 함)
const NO_DRAGGABLE: ReadonlySet<string> = new Set();

type PhotoDragAreaProps = {
  sections: readonly PhotoSection[];
  /** 날짜를 확인하지 못한 사진. 여기서 날짜 섹션으로 끌어 옮길 수 있고, 이 영역으로 놓을 수는 없음 */
  undated: readonly PhotoBoxPhoto[];
  viewer: PhotoBoxViewer;
  actions: PhotoBoxActions;
  /** 선택 모드이고 저장·삭제·날짜 변경이 돌고 있지 않을 때만 끌 수 있음 */
  enabled: boolean;
  /** 날짜 변경 요청이 도는 동안 true(메뉴·저장·삭제도 함께 막도록 화면이 받음) */
  onMovingChange?: ((_moving: boolean) => void) | undefined;
};

// 날짜 바꾸기 실패 문구: 끌던 사진이 그사이 지워졌으면 삭제 안내
const dateChangeFailure = (error: unknown) =>
  error instanceof MissingPhotosError
    ? PHOTO_BOX_MESSAGES.deletedPhoto
    : PHOTO_BOX_MESSAGES.dateChangeFailed;

/**
 * 선택 모드에서 사진을 길게 눌러 다른 날짜 섹션으로 끌어 옮기는 영역
 * 끄는 동안은 섹션별 순서만 미리 바꿔 주변 사진이 비켜 자리를 보여 주고, 놓으면 그 섹션 날짜로 바꿈
 * 이미 있는 섹션으로만 옮길 수 있고(원래 섹션·섹션 밖은 변경 없음), 실패하면 원래 자리로 돌려 오류 토스트를 띄움
 * 키보드·스크린 리더용 대체 경로는 선택 모드의 날짜 바꾸기 시트이고, 키보드 센서는 두지 않음
 */
export const PhotoDragArea = memo(function PhotoDragArea({
  sections,
  undated,
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
  // 미리보기 순서는 끄는 동안과 놓은 뒤 확인·요청이 끝날 때까지만 있음
  // 날짜 변경 요청이 도는 동안(`moving`)은 새로 끌지 못하게 막음(미리보기와 요청 결과가 엉키지 않도록)
  const dragMove = usePhotoDragMove();
  const { activeId, preview, moving, reset } = dragMove;
  const openOverlay = useScreenOverlay();
  const { onToggle } = usePhotoSelectionActions();

  const photoById = new Map(
    [...undated, ...sections.flatMap((section) => section.photos)].map((p) => [p.id, p]),
  );
  const draggableIds = new Set(
    [...photoById.values()].filter((p) => canDragPhoto(p, viewer)).map((photo) => photo.id),
  );

  // 끄는 중에는 미리보기 순서대로 사진을 다시 늘어놓음
  const shownSections = preview
    ? sections.map((section) => ({
        ...section,
        photos: (preview[section.dateKey] ?? [])
          .map((id) => photoById.get(id))
          .filter((photo) => photo !== undefined),
      }))
    : sections;

  // 끌기 미리보기의 처음 모양(날짜 섹션 + 날짜 미확인 영역)
  const initialItems = () => toDragItems(sections, undated);

  // 끄는 중에는 날짜 미확인 영역도 미리보기 순서대로 늘어놓음(원래 영역이 비어도 끌기가 끝날 때까지 남겨 끄는 사진이 사라지지 않게 함)
  const shownUndated = preview
    ? (preview[UNDATED_SECTION_KEY] ?? [])
        .map((id) => photoById.get(id))
        .filter((photo) => photo !== undefined)
    : undated;

  // 선택 모드가 끝나거나 저장·삭제가 시작되어 끌 수 없게 되면 끌던 상태를 걷음
  if (!enabled && dragMove.state.phase !== 'idle' && !moving) reset();
  // 화면 상태가 바뀌어(끌 수 없게 됨) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (!enabled) openOverlay.closeAll();
  }, [enabled, openOverlay]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    dragMove.start(String(active.id), initialItems());
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !preview) return;
    const photoId = String(active.id);
    const overId = String(over.id);
    const overIsSection = overId in preview;
    const targetKey = overIsSection ? overId : findSectionKey(preview, overId);
    if (targetKey === undefined) return;
    // 날짜 미확인 영역에는 놓을 수 없으므로 위로 지나가면 처음 자리로 돌림
    if (targetKey === UNDATED_SECTION_KEY) {
      const origin = initialItems();
      if (findSectionKey(preview, photoId) !== findSectionKey(origin, photoId)) {
        dragMove.setPreview(origin);
      }
      return;
    }
    const list = preview[targetKey] ?? [];
    const index = overIsSection ? list.length : list.indexOf(overId);
    dragMove.setPreview(moveItem(preview, photoId, targetKey, index));
  };

  const move = async (photoId: string, fromKey: string, toKey: string) => {
    dragMove.move();
    onMovingChange?.(true);
    try {
      await actions.changePhotoDates([photoId], dateFromKey(toKey));
    } catch (error) {
      onMovingChange?.(false);
      reset();
      // 끌던 사진이 그사이 지워졌으면 아무것도 바뀌지 않고 목록에서 빠짐
      toast(dateChangeFailure(error));
      return;
    }
    onMovingChange?.(false);
    reset();
    toast(PHOTO_BOX_MESSAGES.dateChanged, {
      action: {
        label: PHOTO_BOX_MESSAGES.undo,
        onClick: () => {
          // 원래 날짜로 한 번 더 바꿔 되돌림(시각은 그대로라 같은 섹션의 원래 순서로 돌아옴). 날짜 미확인 사진이었으면 날짜 없음으로 되돌림(`clearDate`)
          // 원래 날짜가 사진의 촬영 정보에서 온 것이어도 서버는 날짜 출처를 사용자 지정으로 바꾸므로 출처까지 완전히 원복되지는 않음
          void actions
            .changePhotoDates(
              [photoId],
              fromKey === UNDATED_SECTION_KEY ? null : dateFromKey(fromKey),
            )
            .catch((error: unknown) => toast(dateChangeFailure(error)));
        },
      },
    });
  };

  const handleDragEnd = ({ active, over, delta }: DragEndEvent) => {
    const photoId = String(active.id);
    // 조금 길게 누르고 떼기만 했으면 끌기 라이브러리가 클릭을 막았으므로 여기서 선택·해제로 이어 줌
    if (isTapLikeDrag(delta)) {
      reset();
      onToggle(photoId);
      return;
    }
    const fromKey = findSectionKey(initialItems(), photoId);
    const toKey = preview ? findSectionKey(preview, photoId) : undefined;
    // 원래 섹션이나 섹션 밖에 놓으면 아무것도 바꾸지 않음
    if (!over || fromKey === undefined || toKey === undefined || fromKey === toKey) {
      reset();
      return;
    }
    // 확인이 필요하면 놓은 자리에 둔 채 확인 창을 띄움
    const photo = photoById.get(photoId);
    if (photo && needsDragConfirm(photo, viewer)) {
      dragMove.confirm();
      // 「취소」와 Esc만 onOpenChange로 오고(확인 버튼은 닫기 동작이 없음), 취소하면 놓은 자리를 걷고 원래 자리로 돌림
      openOverlay((rootProps, close) => (
        <DateChangeConfirmDialog
          {...rootProps}
          kind={getDateConfirmKind([photo], viewer)}
          onOpenChange={(open) => {
            if (!open) reset();
            rootProps.onOpenChange(open);
          }}
          onConfirm={() => {
            close();
            void move(photoId, fromKey, toKey);
          }}
        />
      ));
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
          onDragStart: () => PHOTO_BOX_MESSAGES.dragStart,
          onDragOver: () => undefined,
          onDragEnd: () => undefined,
          onDragCancel: () => PHOTO_BOX_MESSAGES.dragCancel,
        },
      }}
    >
      <PhotoDragProvider value={{ enabled, draggableIds: moving ? NO_DRAGGABLE : draggableIds }}>
        {/* 끌기가 시작되면 줄어드는 목록 때문에 영역이 사라지지 않도록 처음 사진이 있었는지로 보임 */}
        {undated.length > 0 ? (
          <UndatedPhotos photos={shownUndated} sectionKey={UNDATED_SECTION_KEY} />
        ) : null}
        {shownSections.map((section) => (
          <PhotoDateSection key={section.dateKey} section={section} />
        ))}
      </PhotoDragProvider>
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
});

'use client';

import { LineChevronRightMediumIcon } from '@app/design-system';
import {
  AddBundlePhotoEditor,
  BundlePhotoEditor,
  BundleTitle,
  PhotoImportSheet,
} from '@app/design-system/web';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { PresenceCommands } from '../../hooks/usePresenceSender';
import type { DraftAccess } from '../../lib/permissions';
import type { Draft } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../../constants/messages';
import { ADD_CARD_ID, AUTO_SCROLL } from '../../constants/photoList';
import { useIsPhotoPicked } from '../../hooks/useDraftPicks';
import { usePhotoReorder } from '../../hooks/usePhotoReorder';
import { getRemovePhotoKind } from '../../lib/photos';
import { PresenceScope } from './PresenceScope';
import { useRemovePhotoDialog } from './RemovePhotoDialogs';

type SortablePhotoItemProps = {
  id: string;
  disabled: boolean | { draggable?: boolean; droppable?: boolean };
  children: ReactNode;
};

/** 사진 한 칸: 길게 눌러 끄는 정렬 항목(키보드 끌기는 쓰지 않아 `attributes`는 붙이지 않음) */
function SortablePhotoItem({ id, disabled, children }: SortablePhotoItemProps) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
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
      style={style}
      {...listeners}
      // 떠오른 사진: 95%로 줄이고 사진함 끌기(`PhotoDragArea`)와 같은 70% 불투명도(이전 캡션 화면 끌기와 같은 값)
      className={isDragging ? 'relative shrink-0 scale-95 opacity-70' : 'relative shrink-0'}
    >
      {children}
    </li>
  );
}

type DraftPhotosProps = {
  draft: Draft;
  access: DraftAccess;
  /** 사진 삭제 확정 */
  onRemovePhoto: (_photoId: string) => void;
  /** 참여 멤버가 아니라 고칠 수 없을 때 */
  onDenied: () => void;
  /** 사진 작업(추가 시트·삭제 확인·끌기)을 하는 동안 다른 멤버에게 알림 */
  presence: PresenceCommands;
  /** 끌어서 놓은 사진을 그 자리로 옮김(`toIndex`는 놓은 자리) */
  onMovePhoto: (_photoId: string, _toIndex: number) => void;
  /** 끌기를 시작하거나 끝냈을 때(끄는 동안 다른 멤버의 사진 변경을 미루는 데 씀) */
  onDragChange?: ((_dragging: boolean) => void) | undefined;
  /** 사진을 눌렀을 때(사진 상세로 이동) */
  onOpenPhoto?: ((_photoId: string) => void) | undefined;
  /** 「픽하기 >」를 눌렀을 때(대표 사진 투표 화면으로 이동) */
  onOpenPick?: (() => void) | undefined;
  /** 사진 추가 시트의 「번치 사진함에서 가져오기」 */
  onImportFromBunchBox: () => void;
  /** 사진 추가 시트의 「내 갤러리에서 가져오기」(더 담을 수 있는 장수와 함께) */
  onImportFromGallery: (_maxCount: number) => void;
};

/**
 * 사진 가로 목록(Figma `5367:146358`): 130px 정사각 사진이 가로로 이어지고, 사진마다 오른쪽 위 X(삭제), 맨 끝에 「사진 추가」 타일
 * 제목 줄 오른쪽 「픽하기 >」는 대표 사진 투표 화면으로 가고, 사진을 누르면 사진 상세(크게 보기)로 감
 * 「사진 추가」는 초안 생성자·관리자·공동 관리자에게만 보이고(20장이면 숨김), 삭제는 참여 멤버가 할 수 있으며 마지막 한 장은 지울 수 없음
 * 참여 멤버는 사진을 길게 눌러 좌우로 끌어 순서를 바꿈(기능 spec 4.3.6): 사진이 1장이면 끌 수 없고 「사진 추가」 칸 뒤로는 못 옮김
 */
export function DraftPhotos({
  draft,
  access,
  onRemovePhoto,
  onDenied,
  presence,
  onMovePhoto,
  onDragChange,
  onOpenPhoto,
  onOpenPick,
  onImportFromBunchBox,
  onImportFromGallery,
}: DraftPhotosProps) {
  const total = draft.photos.length;
  const isPicked = useIsPhotoPicked(draft);
  const openOverlay = useScreenOverlay();
  // 시트가 열린 사이 장수가 바뀌어도 고른 순간의 남은 장수로 가져옴
  const importFromGallery = usePreservedCallback(() => onImportFromGallery(MAX_PHOTOS - total));
  const isPickedNow = usePreservedCallback(isPicked);
  // 시트가 열려 있는 동안 사진을 작업 중으로 알림: 열 때의 presence(연결 전에는 아무것도 보내지 않음)가 굳지 않도록 열림 상태만 두고 현재 presence로 알림
  const [importOpen, setImportOpen] = useState(false);
  const openImport = () => {
    // 시트 카드를 연타해도 고른 출처를 한 번만 처리
    let chosen = false;
    const choose = (close: () => void, action: () => void) => {
      if (chosen) return;
      chosen = true;
      close();
      action();
    };
    setImportOpen(true);
    openOverlay(
      (rootProps, close) => (
        <PhotoImportSheet
          {...rootProps}
          onSelectBunchBox={() => choose(close, onImportFromBunchBox)}
          onSelectGallery={() => choose(close, importFromGallery)}
        />
      ),
      () => setImportOpen(false),
    );
  };
  const listRef = useRef<HTMLUListElement>(null);
  const photoIds = draft.photos.map((photo) => photo.id);
  const reorder = usePhotoReorder({
    photoIds,
    onMove: onMovePhoto,
    onDragStateChange: onDragChange,
  });
  // 고칠 수 있는 참여 멤버만, 사진이 2장 이상일 때만 끌 수 있음
  const reorderable = access.canEdit && total > 1;
  const openRemove = useRemovePhotoDialog();
  // 삭제 확인 창이 열려 있는 동안(연결이 끊겼다 이어져도 다시 알리도록 열림 상태로 둠)
  const [removeOpen, setRemoveOpen] = useState(false);

  // 라벨 옆: 사진 작업(추가·삭제·끄는 중)을 하는 멤버 전체(어느 사진인지는 알려 주지 않음)
  const editors = (draft.editing.photoMemberIds ?? []).flatMap((id) => {
    const member = draft.members.find((candidate) => candidate.id === id);
    return member ? [{ name: member.name, src: member.avatarSrc }] : [];
  });

  const requestRemove = (photoId: string) => {
    if (!access.canEdit) return onDenied();
    setRemoveOpen(true);
    // 연 시점의 사진 id를 고정해 그 사이 목록이 바뀌어도 다른 사진을 지우지 않음
    openRemove({
      kind: getRemovePhotoKind(draft.photos),
      isPicked: () => isPickedNow(photoId),
      onConfirm: () => onRemovePhoto(photoId),
      // 지운 사진의 X에 있던 포커스가 사라지므로 창이 다 닫힌 뒤 목록의 첫 버튼으로 옮김
      onClosed: (confirmed) => {
        setRemoveOpen(false);
        if (confirmed) listRef.current?.querySelector<HTMLElement>('button')?.focus();
      },
    });
  };

  return (
    <section aria-labelledby="draft-photos-title" className="pt-s15 gap-s3 flex flex-col">
      <div className="px-padding-p8 flex items-center">
        <BundleTitle
          title={BUNDLE_MESSAGES.photosTitle}
          titleId="draft-photos-title"
          icon={false}
          members={editors}
          membersLabel="편집 중인 멤버"
          className="min-w-0 flex-1"
        />
        {onOpenPick ? (
          <button
            type="button"
            onClick={onOpenPick}
            className="typography-body-4-regular text-text-tertiary gap-s1 focus-visible:outline-border-brand -mr-s2 rounded-r4 flex shrink-0 cursor-pointer touch-manipulation items-center focus-visible:outline-2"
          >
            {BUNDLE_MESSAGES.pickLink}
            <LineChevronRightMediumIcon aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <DndContext
        // 앱이 백그라운드로 가면 끌던 사진을 놓은 것으로 보고 끌기 영역을 새로 만듦
        key={reorder.dragEpoch}
        sensors={reorder.sensors}
        collisionDetection={closestCenter}
        autoScroll={AUTO_SCROLL}
        onDragStart={reorder.onDragStart}
        onDragEnd={reorder.onDragEnd}
        onDragCancel={reorder.onDragCancel}
        // 키보드 끌기는 쓰지 않아 사용 안내는 비우고, 끌기 시작·취소만 기존 문구로 낭독(키보드·스크린 리더용 대체 수단은 따로 정함)
        accessibility={{
          screenReaderInstructions: { draggable: '' },
          announcements: {
            onDragStart: () => BUNDLE_MESSAGES.photoDragStart,
            onDragOver: () => undefined,
            onDragEnd: () => undefined,
            onDragCancel: () => BUNDLE_MESSAGES.photoDragCancel,
          },
        }}
      >
        <SortableContext
          items={access.canAddPhoto && total < MAX_PHOTOS ? [...photoIds, ADD_CARD_ID] : photoIds}
          strategy={horizontalListSortingStrategy}
        >
          <ul
            ref={listRef}
            className="gap-s5 px-padding-p8 flex scrollbar-none overflow-x-auto pt-1 select-none [-webkit-touch-callout:none] [&::-webkit-scrollbar]:hidden"
          >
            {draft.photos.map((photo, index) => (
              <SortablePhotoItem key={photo.id} id={photo.id} disabled={!reorderable}>
                {/* 사진 전체를 누르는 버튼은 아래에 두고, 사진 틀은 X만 눌리게 해서 X와 사진 누르기가 겹치지 않음 */}
                {onOpenPhoto ? (
                  <button
                    type="button"
                    aria-label={BUNDLE_MESSAGES.photoOpenLabel(index + 1)}
                    onClick={() => onOpenPhoto(photo.id)}
                    className="rounded-r4 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2"
                  />
                ) : null}
                <BundlePhotoEditor
                  src={photo.src}
                  alt={photo.alt}
                  size="xs"
                  className="pointer-events-none [&_button]:pointer-events-auto"
                  deleteLabel={BUNDLE_MESSAGES.removePhotoLabel(index + 1)}
                  onDelete={() => requestRemove(photo.id)}
                />
              </SortablePhotoItem>
            ))}
            {access.canAddPhoto && total < MAX_PHOTOS ? (
              // 끌 수는 없지만 사진이 옮겨 갈 때 함께 움직이고, 이 칸에 놓으면 맨 뒤 사진 자리로 감
              <SortablePhotoItem
                id={ADD_CARD_ID}
                disabled={{ draggable: true, droppable: !reorderable }}
              >
                <AddBundlePhotoEditor size="xs" onClick={openImport} />
              </SortablePhotoItem>
            ) : null}
          </ul>
        </SortableContext>
      </DndContext>
      <p role="status" className="sr-only">
        {BUNDLE_MESSAGES.photoCount(total)}
      </p>
      {removeOpen || importOpen || reorder.dragging ? (
        <PresenceScope presence={presence} target="PHOTOS" />
      ) : null}
    </section>
  );
}

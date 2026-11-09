'use client';

import { cn, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { AddBundlePhotoEditor, PhotoImportSheet } from '@app/design-system/web';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftPhoto, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../../constants/messages';
import { ADD_CARD_ID, AUTO_SCROLL } from '../../constants/photoList';
import { usePhotoListScroll } from '../../hooks/usePhotoListScroll';
import { usePhotoRemoval } from '../../hooks/usePhotoRemoval';
import { usePhotoReorder } from '../../hooks/usePhotoReorder';
import { getDraftAccess } from '../../lib/permissions';
import { clampCaption, getPhotoEditors } from '../../lib/photos';
import { DraftPhotoCard } from './DraftPhotoCard';
import { PhotoCaptionField } from './PhotoCaptionField';
import { PhotoMoveButtons } from './PhotoMoveButtons';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

// 캡션 화면의 토스트는 헤더 바로 아래에 뜸(Figma `1782:32928`·`1782:32995`, 입력 중 키보드에 가려지지 않게)
const notify = (message: string) => toast(message, { fullWidth: true, position: 'top' });

type DraftPhotoCaptionProps = {
  draft: Draft;
  viewer: DraftViewer;
  actions: Pick<DraftActions, 'setPhotoCaption' | 'removePhoto' | 'movePhoto'>;
  /** 처음 보여 줄 사진 id(주소가 가리키는 사진). 없는 사진이면 첫 장 */
  initialPhotoId: string | undefined;
  onBack: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange: (_photoId: string) => void;
  onOpenViewer: (_photoId: string) => void;
  /** 「번치 사진함에서 가져오기」: 사진 추가 화면으로 이동 */
  onImportFromBunchBox: () => void;
  /** 「내 갤러리에서 가져오기」: 더 담을 수 있는 장수와 함께 호출 지점을 부름 */
  onImportFromGallery: (_maxCount: number) => void;
};

/**
 * 사진 상세 캡션 화면(Figma `1782:32837` 외, 기능 spec 4.3.4~4.3.5): 헤더 「사진」, 사진 가로 목록과 가운데 사진의 캡션 입력
 * 사진 오른쪽 위 X로 빼고(2장 이상), 길게 눌러 좌우로 끌어 순서를 바꾸며, 사진을 누르면 크게 봄
 * 참여 멤버가 아니면 보기만 하고, 다른 멤버가 편집 중인 사진은 캡션·빼기·옮기기를 막고 안내
 * 순서 바꾸기의 키보드·스크린 리더 대체 경로는 포커스가 있을 때만 보이는 「앞으로·뒤로 옮기기」 버튼
 * 목록 스크롤·사진 빼기·끌기 흐름은 각각 `usePhotoListScroll`·`usePhotoRemoval`·`usePhotoReorder`가 맡음
 */
export function DraftPhotoCaption({
  draft,
  viewer,
  actions,
  initialPhotoId,
  onBack,
  onPhotoChange,
  onOpenViewer,
  onImportFromBunchBox,
  onImportFromGallery,
}: DraftPhotoCaptionProps) {
  const photos = draft.photos;
  const total = photos.length;
  const access = getDraftAccess(draft, viewer);
  const initialIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
  const {
    listRef,
    current,
    setActiveIndex,
    scrollToIndex,
    handleScroll,
    pauseSnap,
    focusPhotoView,
  } = usePhotoListScroll(total, initialIndex);
  const active = photos[current];
  const activeId = active?.id;
  // 커서가 있는 입력란의 사진 id. 사진이 바뀌어 입력란이 교체될 때 blur가 오지 않아도 보는 사진과 달라져 저절로 풀림
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  // 시트 카드를 연타해도 고른 출처를 한 번만 처리(시트가 다시 열릴 때 풀림)
  const importChosen = useRef(false);
  useEffect(() => {
    if (importOpen) importChosen.current = false;
  }, [importOpen]);
  // 옮기거나 뺀 결과 낭독은 그 자리를 보는 동안만 우선하고, 다른 사진으로 넘기면 위치 낭독으로 돌아감
  const [announcement, setAnnouncement] = useState<{ text: string; index: number } | undefined>(
    undefined,
  );

  useEffect(() => {
    if (activeId) onPhotoChange(activeId);
  }, [activeId, onPhotoChange]);

  const editorNamesOf = (photoId: string) =>
    getPhotoEditors(draft, viewer, photoId).flatMap((id) => {
      const member = draft.members.find((candidate) => candidate.id === id);
      return member ? [member.name] : [];
    });
  const isLocked = (photoId: string) => getPhotoEditors(draft, viewer, photoId).length > 0;

  const denyEdit = () => notify(BUNDLE_MESSAGES.editOnlyParticipants);
  const blockEditing = () => notify(BUNDLE_MESSAGES.editingBlocked);

  const removal = usePhotoRemoval({
    photos,
    removePhoto: actions.removePhoto,
    list: { current, setActiveIndex, scrollToIndex, pauseSnap, focusPhotoView },
    canEdit: access.canEdit,
    isLocked,
    onDenied: denyEdit,
    onBlocked: blockEditing,
    announce: setAnnouncement,
  });

  const move = (photoId: string, toIndex: number) => {
    actions.movePhoto(photoId, toIndex);
    const next = Math.min(Math.max(0, toIndex), total - 1);
    setActiveIndex(next);
    setAnnouncement({ text: BUNDLE_MESSAGES.photoMoved(next + 1, total), index: next });
    // 옮긴 사진이 가운데 오게 맞춤(상태가 반영된 다음 그리는 위치)
    requestAnimationFrame(() => scrollToIndex(next));
  };
  const reorder = usePhotoReorder({ photoIds: photos.map((photo) => photo.id), onMove: move });

  const changeCaption = (value: string) => {
    if (!active || !access.canEdit) return;
    const { text, exceeded } = clampCaption(value);
    if (exceeded) notify(BUNDLE_MESSAGES.captionTooLong);
    actions.setPhotoCaption(active.id, text);
  };

  // 캡션 입력란이 편집 잠금으로 사라지면 포커스·blur 이벤트가 없어도 끌기를 막지 않도록 입력 중인지는 잠금과 함께 봄
  const dragDisabled =
    !access.canEdit ||
    total < 2 ||
    (focusedPhotoId !== undefined &&
      focusedPhotoId === activeId &&
      !(active && isLocked(active.id)));
  const editorNames = active ? editorNamesOf(active.id) : [];
  const addable = access.canEdit && total < MAX_PHOTOS;
  // 화면설계서 1-1: 사진 왼쪽 위에는 올린 멤버가 아니라 그 사진을 편집 중인 멤버의 프로필을 보임
  const editorOf = (photo: DraftPhoto) => {
    const member = draft.members.find(
      (candidate) => candidate.id === getPhotoEditors(draft, viewer, photo.id)[0],
    );
    return member ? { name: member.name, src: member.avatarSrc } : undefined;
  };

  // 순서를 옮긴 직후에는 옮긴 결과, 아니면 지금 사진 위치
  let statusMessage = '';
  if (announcement && announcement.index === current) statusMessage = announcement.text;
  else if (active) statusMessage = BUNDLE_MESSAGES.photoPosition(current + 1, total);

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
          title={BUNDLE_MESSAGES.photosTitle}
        />
      }
    >
      {/* 화면 이동 뒤 초점이 가는 제목(web-interface-guidelines 「화면 이동 뒤 초점」): 코어 Header의 제목은 h1이 아니라 따로 둠 */}
      <h1 className="sr-only">{BUNDLE_MESSAGES.photoCaptionTitle}</h1>
      <p role="status" className="sr-only">
        {statusMessage}
      </p>
      <DndContext
        key={reorder.dragEpoch}
        sensors={reorder.sensors}
        collisionDetection={closestCenter}
        autoScroll={AUTO_SCROLL}
        onDragStart={reorder.onDragStart}
        onDragEnd={reorder.onDragEnd}
        onDragCancel={reorder.onDragCancel}
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
          items={photos.map((photo) => photo.id)}
          strategy={horizontalListSortingStrategy}
        >
          <ul
            ref={listRef}
            onScroll={handleScroll}
            className={cn(
              'gap-s6 px-padding-p8 scroll-px-padding-p8 pt-s8 flex snap-x scrollbar-none overflow-x-auto [&::-webkit-scrollbar]:hidden',
              reorder.dragging ? 'snap-none' : 'snap-mandatory',
            )}
          >
            {photos.map((photo, index) => (
              <DraftPhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                total={total}
                editor={editorOf(photo)}
                dragDisabled={dragDisabled || isLocked(photo.id)}
                locked={isLocked(photo.id)}
                canEdit={access.canEdit}
                onView={() => onOpenViewer(photo.id)}
                onRemove={() => removal.requestRemove(photo)}
                onLockedPress={blockEditing}
                moveRef={removal.register(photo.id)}
              />
            ))}
            {addable && (
              <li ref={removal.register(ADD_CARD_ID)} className="shrink-0 snap-start">
                <AddBundlePhotoEditor size="m" onClick={() => setImportOpen(true)} />
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
      {active && (
        <div className="pt-padding-p8 px-padding-p8">
          <PhotoCaptionField
            key={active.id}
            value={active.caption}
            readOnly={!access.canEdit}
            editorNames={editorNames}
            onChange={changeCaption}
            onFocus={() => setFocusedPhotoId(active.id)}
            onBlur={() => setFocusedPhotoId(undefined)}
            onDenied={denyEdit}
            onEditingBlocked={blockEditing}
          />
          {access.canEdit && total > 1 && editorNames.length === 0 && (
            <PhotoMoveButtons
              index={current}
              total={total}
              onMoveBefore={() => move(active.id, current - 1)}
              onMoveAfter={() => move(active.id, current + 1)}
            />
          )}
        </div>
      )}
      <PhotoImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSelectBunchBox={() => {
          if (importChosen.current) return;
          importChosen.current = true;
          setImportOpen(false);
          onImportFromBunchBox();
        }}
        onSelectGallery={() => {
          if (importChosen.current) return;
          importChosen.current = true;
          setImportOpen(false);
          onImportFromGallery(MAX_PHOTOS - total);
        }}
      />
      <RemovePhotoDialogs
        kind={removal.removeDialog?.kind}
        picked={
          (photos.find((photo) => photo.id === removal.removeDialog?.photoId)?.pickedBy?.length ??
            0) > 0
        }
        onClose={removal.closeDialog}
        onConfirm={removal.confirmRemove}
      />
    </PageShell>
  );
}

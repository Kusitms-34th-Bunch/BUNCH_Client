'use client';

import { cn, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { AddBundlePhoto, BundlePhoto, DeleteButton } from '@app/design-system/web';
import {
  type DragEndEvent,
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftPhoto, DraftViewer } from '../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../constants/messages';
import { SLOW_MOVE, useMoveAnimation } from '../hooks/useMoveAnimation';
import { getDraftAccess } from '../lib/permissions';
import { clampCaption, getPhotoEditors, getRemovePhotoKind } from '../lib/photos';
import { PhotoCaptionField } from './PhotoCaptionField';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

// BundlePhoto `m`(330px)와 사진 사이 간격 12px: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준
const PHOTO_STEP = 330 + 12;
// 길게 누르기: 이만큼 누르고 있어야 사진이 떠오르고, 그 전에 움직이면 가로 스크롤로 넘김(기능 spec 4.3.5)
const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE_PX = 8;
// 확인 창 닫힘 전환이 끝난 뒤에 포커스를 옮기려는 지연
const CLOSE_TRANSITION_MS = 150;
// 「+ 사진 추가」 카드도 사진을 뺄 때 함께 움직이도록 등록하는 id(사진 id와 겹치지 않는 값)
const ADD_CARD_ID = 'add-photo-card';
// 이동이 끝난 뒤 스크롤 스냅을 되돌리기 전에 두는 여유
const SNAP_RESTORE_GAP_MS = 50;

// 캡션 화면의 토스트는 헤더 바로 아래에 뜸(Figma `1782:32928`·`1782:32995`, 입력 중 키보드에 가려지지 않게)
const notify = (message: string) => toast(message, { fullWidth: true, position: 'top' });

type PhotoItemProps = {
  photo: DraftPhoto;
  index: number;
  total: number;
  /** 다른 멤버가 이 사진을 편집 중이면 그 멤버(없으면 프로필을 보이지 않음) */
  editor: { name: string; src?: string | undefined } | undefined;
  /** 끌어서 옮길 수 없는 상태(읽기 전용·1장·키보드가 올라와 있음·다른 멤버가 편집 중) */
  dragDisabled: boolean;
  /** 다른 멤버가 편집 중이라 이 사진의 수정이 막힘 */
  locked: boolean;
  canEdit: boolean;
  onView: () => void;
  onRemove: () => void;
  /** 잠긴 사진을 길게 눌렀을 때 */
  onLockedPress: () => void;
  /** 사진을 빼서 남은 사진이 자리를 메울 때 움직이도록 항목을 등록하는 ref */
  moveRef: (_element: HTMLElement | null) => void;
};

/** 가로 목록의 사진 한 장: 눌러 크게 보기, X로 빼기, 길게 눌러 끌기 */
function PhotoItem({
  photo,
  index,
  total,
  editor,
  dragDisabled,
  locked,
  canEdit,
  onView,
  onRemove,
  onLockedPress,
  moveRef,
}: PhotoItemProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled: dragDisabled,
  });
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearPress = () => clearTimeout(pressTimer.current);
  useEffect(() => clearPress, []);

  return (
    <li
      ref={(element) => {
        setNodeRef(element);
        moveRef(element);
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
      // 잠긴 사진은 끌 수 없으므로 길게 누르면 안내(끌기 센서가 꺼져 있어 직접 시간을 잼)
      onPointerDown={
        locked && canEdit
          ? () => {
              clearPress();
              pressTimer.current = setTimeout(onLockedPress, LONG_PRESS_MS);
            }
          : undefined
      }
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
      className={cn(
        'relative shrink-0 snap-start select-none [-webkit-touch-callout:none]',
        '[&_img]:pointer-events-none',
        isDragging && 'z-10 scale-105 opacity-90',
      )}
    >
      <BundlePhoto
        src={photo.src}
        alt={photo.alt}
        size="m"
        uploader={editor}
        uploaderLabel={editor ? BUNDLE_MESSAGES.editingLabel(editor.name) : undefined}
        page={{ current: index + 1, total }}
      />
      {/* 사진 전체를 누르면 크게 보기. 빼기 버튼은 이 위에 얹어 따로 누를 수 있게 함 */}
      <button
        type="button"
        data-photo-view=""
        aria-label={BUNDLE_MESSAGES.photoViewLabel(index + 1)}
        onClick={onView}
        className="rounded-r4 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      {canEdit && (
        <div className="p-s8 pointer-events-none absolute inset-x-0 top-0 flex h-15.75 items-center justify-end">
          <DeleteButton
            label={BUNDLE_MESSAGES.removePhotoLabel(index + 1)}
            size="L"
            variant="overlay"
            onClick={onRemove}
            className="pointer-events-auto"
          />
        </div>
      )}
    </li>
  );
}

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
};

/**
 * 사진 상세 캡션 화면(Figma `1782:32837` 외, 기능 spec 4.3.4~4.3.5): 헤더 「사진」, 사진 가로 목록과 가운데 사진의 캡션 입력
 * 사진 오른쪽 위 X로 빼고(2장 이상), 길게 눌러 좌우로 끌어 순서를 바꾸며, 사진을 누르면 크게 봄
 * 참여 멤버가 아니면 보기만 하고, 다른 멤버가 편집 중인 사진은 캡션·빼기·옮기기를 막고 안내
 * 순서 바꾸기의 키보드·스크린 리더 대체 경로는 포커스가 있을 때만 보이는 「앞으로·뒤로 옮기기」 버튼
 */
export function DraftPhotoCaption({
  draft,
  viewer,
  actions,
  initialPhotoId,
  onBack,
  onPhotoChange,
  onOpenViewer,
}: DraftPhotoCaptionProps) {
  const photos = draft.photos;
  const total = photos.length;
  const access = getDraftAccess(draft, viewer);
  const initialIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [captionFocused, setCaptionFocused] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<
    { kind: 'last' | 'captioned'; photoId: string } | undefined
  >(undefined);
  // 옮기거나 뺀 결과 낭독은 그 자리를 보는 동안만 우선하고, 다른 사진으로 넘기면 위치 낭독으로 돌아감
  const [announcement, setAnnouncement] = useState<{ text: string; index: number } | undefined>(
    undefined,
  );
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 앱이 백그라운드로 가면 끌던 사진을 놓은 것으로 보고 끌기 영역을 새로 만듦
  const [dragEpoch, setDragEpoch] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const current = Math.min(activeIndex, Math.max(0, total - 1));
  const active = photos[current];
  const activeId = active?.id;

  // 사진을 뺀 결과를 그릴 때 새로 보일 사진 자리로 스크롤을 먼저 맞춘 뒤(아래 움직임보다 먼저 실행), 남은 사진이 그 자리로 이동
  const pendingScroll = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const index = pendingScroll.current;
    pendingScroll.current = undefined;
    const list = listRef.current;
    if (index !== undefined && list) list.scrollLeft = index * PHOTO_STEP;
  });
  const { register, capture } = useMoveAnimation(SLOW_MOVE);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX },
    }),
  );

  const scrollToIndex = (index: number) => {
    const list = listRef.current;
    if (list) list.scrollLeft = index * PHOTO_STEP;
  };

  // 처음에는 주소가 가리키는 사진이 가운데 오게 맞춤
  const initialIndexRef = useRef(initialIndex);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollLeft = initialIndexRef.current * PHOTO_STEP;
  }, []);

  useEffect(
    () => () => {
      clearTimeout(focusTimer.current);
      clearTimeout(snapTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (activeId) onPhotoChange(activeId);
  }, [activeId, onPhotoChange]);

  useEffect(() => {
    const cancelDrag = () => {
      if (document.visibilityState === 'hidden') setDragEpoch((epoch) => epoch + 1);
    };
    document.addEventListener('visibilitychange', cancelDrag);
    return () => document.removeEventListener('visibilitychange', cancelDrag);
  }, []);

  const editorNamesOf = (photoId: string) =>
    getPhotoEditors(draft, viewer, photoId).flatMap((id) => {
      const member = draft.members.find((candidate) => candidate.id === id);
      return member ? [member.name] : [];
    });
  const isLocked = (photoId: string) => getPhotoEditors(draft, viewer, photoId).length > 0;

  const denyEdit = () => notify(BUNDLE_MESSAGES.editOnlyParticipants);
  const blockEditing = () => notify(BUNDLE_MESSAGES.editingBlocked);

  const changeCaption = (value: string) => {
    if (!active || !access.canEdit) return;
    const { text, exceeded } = clampCaption(value);
    if (exceeded) notify(BUNDLE_MESSAGES.captionTooLong);
    actions.setPhotoCaption(active.id, text);
  };

  const requestRemove = (photo: DraftPhoto) => {
    if (!access.canEdit) return denyEdit();
    if (isLocked(photo.id)) return blockEditing();
    const kind = getRemovePhotoKind(photos, photo);
    if (kind === 'direct') removeAndFocus(photo.id, 0);
    else setRemoveDialog({ kind, photoId: photo.id });
  };

  // 빼면 눌렀던 X가 사라지므로 같은 자리에 온 사진의 「크게 보기」 버튼으로 포커스를 옮기고 남은 장수를 알림(확인 창은 닫힌 뒤)
  const removeAndFocus = (photoId: string, delay: number) => {
    const remaining = photos.filter((item) => item.id !== photoId);
    const nextIndex = Math.min(current, remaining.length - 1);
    // 남은 사진이 빈자리를 메우는 움직임(Smart Animate, Slow, 350ms)을 위해 빼기 전 위치를 기억
    capture();
    // 움직이는 동안 transform이 늘린 스크롤 영역에 스냅이 다시 맞춰져 목록이 끌려가므로 스냅을 잠깐 끔
    const list = listRef.current;
    // 동작 줄이기에서는 이동이 없으니 스냅을 끌 이유가 없음
    if (list && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.style.scrollSnapType = 'none';
      clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => {
        list.style.scrollSnapType = '';
      }, SLOW_MOVE.durationMs + SNAP_RESTORE_GAP_MS);
    }
    actions.removePhoto(photoId);
    // 마지막 사진을 빼면 스크롤이 끝으로 밀려 「+ 사진 추가」 카드가 가운데 오므로, 새로 보일 사진이 가운데 오게 맞춤
    setActiveIndex(nextIndex);
    pendingScroll.current = nextIndex;
    const next = remaining[nextIndex];
    if (next)
      setAnnouncement({ text: BUNDLE_MESSAGES.photoRemoved(remaining.length), index: nextIndex });
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      listRef.current
        ?.querySelectorAll<HTMLElement>('[data-photo-view]')
        [nextIndex]?.focus({ preventScroll: true });
    }, delay);
  };

  const move = (photoId: string, toIndex: number) => {
    actions.movePhoto(photoId, toIndex);
    const next = Math.min(Math.max(0, toIndex), total - 1);
    setActiveIndex(next);
    setAnnouncement({ text: BUNDLE_MESSAGES.photoMoved(next + 1, total), index: next });
    // 옮긴 사진이 가운데 오게 맞춤(상태가 반영된 다음 그리는 위치)
    requestAnimationFrame(() => scrollToIndex(next));
  };

  const handleDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return;
    const to = photos.findIndex((photo) => photo.id === over.id);
    if (to >= 0) move(String(dragged.id), to);
  };

  // 캡션 입력란이 편집 잠금으로 사라지면 포커스·blur 이벤트가 없어도 끌기를 막지 않도록 입력 중인지는 잠금과 함께 봄
  const dragDisabled =
    !access.canEdit || total < 2 || (captionFocused && !(active && isLocked(active.id)));
  const editorNames = active ? editorNamesOf(active.id) : [];
  const addable = access.canEdit && total < MAX_PHOTOS;
  // 화면설계서 1-1: 사진 왼쪽 위에는 올린 멤버가 아니라 그 사진을 편집 중인 멤버의 프로필을 보임
  const editorOf = (photo: DraftPhoto) => {
    const member = draft.members.find(
      (candidate) => candidate.id === getPhotoEditors(draft, viewer, photo.id)[0],
    );
    return member ? { name: member.name, src: member.avatarSrc } : undefined;
  };

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
      <p role="status" className="sr-only">
        {announcement && announcement.index === current
          ? announcement.text
          : active
            ? BUNDLE_MESSAGES.photoPosition(current + 1, total)
            : ''}
      </p>
      <DndContext
        key={dragEpoch}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
            onScroll={(event) =>
              setActiveIndex(
                Math.min(
                  Math.max(0, Math.round(event.currentTarget.scrollLeft / PHOTO_STEP)),
                  Math.max(0, total - 1),
                ),
              )
            }
            className="gap-s6 px-padding-p8 scroll-px-padding-p8 pt-s8 flex snap-x snap-mandatory scrollbar-none overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {photos.map((photo, index) => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                index={index}
                total={total}
                editor={editorOf(photo)}
                dragDisabled={dragDisabled || isLocked(photo.id)}
                locked={isLocked(photo.id)}
                canEdit={access.canEdit}
                onView={() => onOpenViewer(photo.id)}
                onRemove={() => requestRemove(photo)}
                onLockedPress={blockEditing}
                moveRef={register(photo.id)}
              />
            ))}
            {addable && (
              <li ref={register(ADD_CARD_ID)} className="shrink-0 snap-start">
                <AddBundlePhoto size="m" />
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
            onFocus={() => setCaptionFocused(true)}
            onBlur={() => setCaptionFocused(false)}
            onDenied={denyEdit}
            onEditingBlocked={blockEditing}
          />
          {access.canEdit && total > 1 && editorNames.length === 0 && (
            <div className="relative">
              {/* 끌기의 키보드·스크린 리더 대체 수단(포커스가 있을 때만 보임) */}
              <button
                type="button"
                onClick={() => current > 0 && move(active.id, current - 1)}
                aria-disabled={current <= 0 ? true : undefined}
                className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 focus-visible:outline-border-brand sr-only focus-visible:not-sr-only focus-visible:outline-2"
              >
                {BUNDLE_MESSAGES.movePhotoBefore}
              </button>
              <button
                type="button"
                onClick={() => current < total - 1 && move(active.id, current + 1)}
                aria-disabled={current >= total - 1 ? true : undefined}
                className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 focus-visible:outline-border-brand sr-only focus-visible:not-sr-only focus-visible:outline-2"
              >
                {BUNDLE_MESSAGES.movePhotoAfter}
              </button>
            </div>
          )}
        </div>
      )}
      <RemovePhotoDialogs
        kind={removeDialog?.kind}
        onClose={() => setRemoveDialog(undefined)}
        onConfirm={() => {
          // 확인 창이 떠 있는 사이 다른 멤버가 편집을 시작했거나 사진이 이미 빠졌을 수 있어 다시 확인
          if (removeDialog && photos.some((photo) => photo.id === removeDialog.photoId)) {
            if (isLocked(removeDialog.photoId)) blockEditing();
            else removeAndFocus(removeDialog.photoId, CLOSE_TRANSITION_MS);
          }
          setRemoveDialog(undefined);
        }}
      />
    </PageShell>
  );
}

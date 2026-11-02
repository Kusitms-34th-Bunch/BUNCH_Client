'use client';

import { cn } from '@app/design-system';
import { BundlePhoto, DeleteButton } from '@app/design-system/web';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef } from 'react';
import type { DraftPhoto } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { LONG_PRESS_MS } from '../constants/photoList';

type DraftPhotoCardProps = {
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

/**
 * 캡션 화면 가로 목록의 사진 한 장: 눌러 크게 보기, X로 빼기, 길게 눌러 끌기(`DraftPhotoCaption`이 정렬 영역을 둠)
 * 사진 전체를 덮는 「크게 보기」 버튼 위에 X를 따로 얹어 각각 누를 수 있게 하고, 사진 왼쪽 위에는 편집 중인 멤버 프로필을 보임
 */
export function DraftPhotoCard({
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
}: DraftPhotoCardProps) {
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
        // 떠오른 사진: 95%로 줄이고 사진함 끌기(`PhotoDragArea`)와 같은 70% 불투명도
        isDragging && 'z-10 scale-95 opacity-70',
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

'use client';

import { cn } from '@app/design-system';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PhotoBoxPhoto } from '../lib/types';
import { PhotoCell } from './PhotoCell';
import { usePhotoDrag } from './PhotoDragContext';

type PhotoGridProps = {
  photos: readonly PhotoBoxPhoto[];
  /** 목록의 접근성 이름(예: 날짜) */
  label: string;
  /** 끌어서 옮길 수 있는 목록이면 그 섹션의 키(날짜). 없으면 끌 수 없는 목록 */
  sectionKey?: string | undefined;
};

/** 길게 눌러 끌 수 있는 사진 한 칸. 끄는 동안 원래 자리는 흐리게 남고 복사본이 손가락을 따라감 */
function SortablePhotoItem({ photo, draggable }: { photo: PhotoBoxPhoto; draggable: boolean }) {
  const { setNodeRef, transform, transition, isDragging, listeners } = useSortable({
    id: photo.id,
    disabled: !draggable,
  });

  return (
    <li
      ref={setNodeRef}
      // 속성(role·tabIndex)은 붙이지 않음: 목록 항목 의미와 사진 칸 버튼의 포커스를 그대로 둠
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        // 길게 누르기 전에는 스크롤이 먼저이고, iOS 길게 누름 메뉴·글자 선택은 끔
        draggable && 'select-none [-webkit-touch-callout:none]',
        isDragging && 'opacity-40',
      )}
    >
      <PhotoCell photo={photo} />
    </li>
  );
}

/** 한 줄 3장 정사각형 사진 목록(사이 간격 1px) */
export function PhotoGrid({ photos, label, sectionKey }: PhotoGridProps) {
  const { enabled, draggableIds } = usePhotoDrag();

  // 날짜 섹션은 끌기가 꺼져 있어도 같은 트리를 써서 선택 모드 진입·종료와 저장·삭제 중에 사진 칸이 다시 마운트되지 않게 함
  if (sectionKey === undefined) {
    return (
      <ul aria-label={label} className="grid grid-cols-3 gap-px">
        {photos.map((photo) => (
          <li key={photo.id}>
            <PhotoCell photo={photo} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SortableContext
      id={sectionKey}
      items={photos.map((photo) => photo.id)}
      strategy={rectSortingStrategy}
    >
      <ul aria-label={label} className="grid grid-cols-3 gap-px">
        {photos.map((photo) => (
          <SortablePhotoItem
            key={photo.id}
            photo={photo}
            draggable={enabled && draggableIds.has(photo.id)}
          />
        ))}
      </ul>
    </SortableContext>
  );
}

'use client';

import { PhotoThumbnail } from '@app/design-system/web';
import { useState } from 'react';
import type { PhotoBoxPhoto } from '../lib/types';
import { getSelectionOrder } from '../lib/selection';
import { usePhotoSelection } from './PhotoSelectionContext';
import { SavingDots } from './SavingDots';

type PhotoCellProps = {
  photo: PhotoBoxPhoto;
};

/**
 * 사진 한 칸(123px 정사각형). 처리 중이거나 불러오지 못한 사진은 회색 자리표시로 표시
 * 선택 모드에서는 눌러서 고르는 버튼이 되고 고른 순서를 번호로 보임(자리표시는 고를 수 없음)
 */
export function PhotoCell({ photo }: PhotoCellProps) {
  const [broken, setBroken] = useState(false);
  const { active, selection, savingIds, onToggle } = usePhotoSelection();

  if (photo.status !== 'ready' || broken) {
    const label = photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진';
    return (
      <div role="img" aria-label={label} className="bg-surface-tertiary aspect-square w-full" />
    );
  }

  const order = getSelectionOrder(selection, photo.id);

  const saving = savingIds.includes(photo.id);

  return (
    <div className="relative">
      <PhotoThumbnail
        src={photo.src}
        alt={photo.alt}
        className="w-full"
        selectionMode={active}
        selected={order !== undefined}
        selectionOrder={order}
        onClick={active ? () => onToggle(photo.id) : undefined}
        onImageError={() => setBroken(true)}
      />
      {saving ? (
        // 앨범에 저장하는 동안 사진 위에 점 3개 로딩(디자이너 전달 로티, 상태는 화면의 live region이 한 번에 안내)
        <span className="bg-overlay-pressed absolute inset-0 flex items-center justify-center">
          <SavingDots />
        </span>
      ) : null}
    </div>
  );
}

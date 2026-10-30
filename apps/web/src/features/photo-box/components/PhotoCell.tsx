'use client';

import { PhotoThumbnail } from '@app/design-system/web';
import Link from 'next/link';
import { useState } from 'react';
import type { PhotoBoxPhoto } from '../lib/types';
import { PHOTO_BOX_PATHS } from '../constants/paths';
import { getSelectionOrder } from '../lib/selection';
import { usePhotoSelection } from './PhotoSelectionContext';

type PhotoCellProps = {
  photo: PhotoBoxPhoto;
};

/**
 * 사진 한 칸(123px 정사각형). 처리 중이거나 불러오지 못한 사진은 회색 자리표시로 표시
 * 선택 모드에서는 눌러서 고르는 버튼이 되고 고른 순서를 번호로 보임(자리표시는 고를 수 없음), 그 밖에서는 사진 상세 링크
 */
export function PhotoCell({ photo }: PhotoCellProps) {
  const [broken, setBroken] = useState(false);
  const { active, selection, onToggle } = usePhotoSelection();

  if (photo.status !== 'ready' || broken) {
    const label = photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진';
    return (
      <div role="img" aria-label={label} className="bg-surface-tertiary aspect-square w-full" />
    );
  }

  const order = getSelectionOrder(selection, photo.id);

  const thumbnail = (
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
  );

  // 선택 모드에서는 눌러서 고르고, 그 밖에서는 사진 상세로 이동(주소로 열 수 있게 링크로 둠)
  if (active) return thumbnail;
  return (
    <Link
      href={PHOTO_BOX_PATHS.detail(photo.id)}
      prefetch={false}
      className="focus-visible:outline-border-brand block focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      {thumbnail}
    </Link>
  );
}

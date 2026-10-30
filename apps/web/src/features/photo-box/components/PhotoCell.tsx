'use client';

import { PhotoThumbnail } from '@app/design-system/web';
import { useState } from 'react';
import type { PhotoBoxPhoto } from '../lib/types';

type PhotoCellProps = {
  photo: PhotoBoxPhoto;
};

/** 사진 한 칸(123px 정사각형). 처리 중이거나 불러오지 못한 사진은 회색 자리표시로 표시 */
export function PhotoCell({ photo }: PhotoCellProps) {
  const [broken, setBroken] = useState(false);

  if (photo.status !== 'ready' || broken) {
    const label = photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진';
    return (
      <div role="img" aria-label={label} className="bg-surface-tertiary aspect-square w-full" />
    );
  }

  return (
    <PhotoThumbnail
      src={photo.src}
      alt={photo.alt}
      className="w-full"
      onImageError={() => setBroken(true)}
    />
  );
}

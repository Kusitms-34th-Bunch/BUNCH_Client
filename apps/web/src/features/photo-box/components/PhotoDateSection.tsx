'use client';

import { useDroppable } from '@dnd-kit/core';
import { useId } from 'react';
import type { PhotoSection } from '../lib/photoDate';
import { usePhotoDrag } from './PhotoDragContext';
import { PhotoGrid } from './PhotoGrid';

type PhotoDateSectionProps = {
  section: PhotoSection;
};

/** 촬영 날짜 제목과 그 날짜의 사진 목록. 끄는 중에는 섹션 전체(제목·빈자리 포함)가 놓을 수 있는 영역 */
export function PhotoDateSection({ section }: PhotoDateSectionProps) {
  const headingId = useId();
  const { enabled } = usePhotoDrag();
  const { setNodeRef } = useDroppable({ id: section.dateKey, disabled: !enabled });

  return (
    <section ref={setNodeRef} aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="typography-body-3-semi-bold text-text-secondary pt-s8 pr-s7 pb-s3 pl-s8"
      >
        {section.label}
      </h2>
      <PhotoGrid photos={section.photos} label={section.label} sectionKey={section.dateKey} />
    </section>
  );
}

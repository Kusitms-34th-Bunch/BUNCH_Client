'use client';

import { memo, useId } from 'react';
import type { PhotoSection } from '@/features/photo-box/lib/photoDate';
import { PhotoCell } from '@/features/photo-box/components/PhotoCell';

type SelectDateSectionProps = {
  section: PhotoSection;
};

/** 촬영 날짜 제목(13px SemiBold)과 3열 사진 격자. 사진 칸은 선택 모드의 사진함 칸을 그대로 쓰며 적용 뒤 스크롤 대상이 되도록 id를 가짐 */
export const SelectDateSection = memo(function SelectDateSection({
  section,
}: SelectDateSectionProps) {
  const headingId = useId();

  return (
    <section id={`select-section-${section.dateKey}`} aria-labelledby={headingId}>
      {/* 추천 번들을 적용한 뒤 키보드·스크린 리더 사용자가 그 날짜로 이어서 탐색하도록 프로그램으로 포커스를 받음 */}
      <h2
        id={headingId}
        tabIndex={-1}
        className="typography-body-4-semi-bold text-text-primary px-s8 pt-s8 pb-s3 focus-visible:outline-border-brand outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        {section.label}
      </h2>
      <ul className="grid grid-cols-3 gap-px">
        {section.photos.map((photo) => (
          <li key={photo.id}>
            <PhotoCell photo={photo} />
          </li>
        ))}
      </ul>
    </section>
  );
});

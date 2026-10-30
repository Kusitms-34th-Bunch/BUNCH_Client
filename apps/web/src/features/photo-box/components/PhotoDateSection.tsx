import { useId } from 'react';
import type { PhotoSection } from '../lib/photoDate';
import { PhotoGrid } from './PhotoGrid';

type PhotoDateSectionProps = {
  section: PhotoSection;
};

/** 촬영 날짜 제목과 그 날짜의 사진 목록 */
export function PhotoDateSection({ section }: PhotoDateSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="typography-body-3-semi-bold text-text-secondary pt-s8 pr-s7 pb-s3 pl-s8"
      >
        {section.label}
      </h2>
      <PhotoGrid photos={section.photos} label={section.label} />
    </section>
  );
}

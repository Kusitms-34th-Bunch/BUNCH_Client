import type { PhotoBoxPhoto } from '../lib/types';
import { PhotoCell } from './PhotoCell';

type PhotoGridProps = {
  photos: readonly PhotoBoxPhoto[];
  /** 목록의 접근성 이름(예: 날짜) */
  label: string;
};

/** 한 줄 3장 정사각형 사진 목록(사이 간격 1px) */
export function PhotoGrid({ photos, label }: PhotoGridProps) {
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

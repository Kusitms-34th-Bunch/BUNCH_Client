'use client';

import { Accordion } from '@app/design-system/web';
import { useState } from 'react';
import type { PhotoBoxPhoto } from '../lib/types';
import { PhotoGrid } from './PhotoGrid';

type UndatedPhotosProps = {
  photos: readonly PhotoBoxPhoto[];
};

/**
 * 촬영 날짜를 확인하지 못한 사진 영역(기본 접힘, 펼치면 3열)
 * 접힌 모양은 좌우 16px 여백의 둥근 카드, 펼치면 여백 없이 전체 폭(Figma 사진함_02·03)
 * 열고 닫는 모션 값은 Figma에 없어 `Accordion` 기본 동작 사용
 */
export function UndatedPhotos({ photos }: UndatedPhotosProps) {
  const [open, setOpen] = useState(false);

  return (
    <Accordion
      headingLevel={2}
      title="촬영 날짜를 확인할 사진"
      count={`${photos.length}장`}
      description="날짜 확인하고 추억 정리하기"
      open={open}
      onOpenChange={setOpen}
      className={open ? 'mt-s6' : 'mx-s8 mt-s6 rounded-r4 overflow-hidden'}
    >
      <PhotoGrid photos={photos} label="촬영 날짜를 확인할 사진" />
    </Accordion>
  );
}

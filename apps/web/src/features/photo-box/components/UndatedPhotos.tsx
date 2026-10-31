'use client';

import { cn } from '@app/design-system';
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
 * 열고 닫는 340ms 전환은 `Accordion`이 맡고, 여백·모서리 변화도 같은 값으로 전환
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
      className={cn(
        'mt-s6 overflow-hidden transition-[margin,border-radius] duration-340 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
        open ? 'mx-0 rounded-none' : 'mx-s8 rounded-r4',
      )}
    >
      <PhotoGrid photos={photos} label="촬영 날짜를 확인할 사진" />
    </Accordion>
  );
}

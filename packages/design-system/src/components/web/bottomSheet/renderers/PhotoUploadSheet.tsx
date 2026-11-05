'use client';

import { UploadOptionCard } from '../../uploadOptionCard';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type PhotoUploadSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 시트 제목. 예: `퇴근런클럽에 사진 올리기` */
  title: string;
  onSelectAlbum: () => void;
  onTakePhoto: () => void;
};

/**
 * 사진 올리기 방식 선택 시트(Figma Bottom Sheet 01, `2487:46357`)
 * 카드 선택 시 자동으로 닫지 않음. 닫기·앨범·카메라 실행은 호출자 담당
 */
export const PhotoUploadSheet = ({
  title,
  onSelectAlbum,
  onTakePhoto,
  ...rootProps
}: PhotoUploadSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    {/* Figma 01 간격(손잡이 아래 14, 제목·카드 사이 10) 적용 */}
    <BottomSheet.Content className="gap-0">
      <BottomSheet.Header className="pt-padding-p7">
        <BottomSheet.Title className="typography-heading-2-semibold">{title}</BottomSheet.Title>
        <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
      </BottomSheet.Header>
      <BottomSheet.Body className="mt-s5 gap-s3 pb-s10 flex flex-col">
        <UploadOptionCard
          title="앨범에서 선택"
          description="여러 장을 한 번에 올려요."
          onClick={onSelectAlbum}
        />
        <UploadOptionCard
          icon="camera"
          title="카메라로 찍기"
          description="지금 찍은 사진을 바로 올려요."
          onClick={onTakePhoto}
        />
      </BottomSheet.Body>
    </BottomSheet.Content>
  </BottomSheet.Root>
);

'use client';

import { UploadOptionCard } from '../../uploadOptionCard';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type PhotoImportSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 「번치 사진함에서 가져오기」를 눌렀을 때 */
  onSelectBunchBox: () => void;
  /** 「내 갤러리에서 가져오기」를 눌렀을 때 */
  onSelectGallery: () => void;
};

/**
 * 번들에 사진을 더할 출처 선택 시트(Figma `1782:33039`): 「어디서 사진을 가져올까요?」와 번치 사진함·내 갤러리 두 카드
 * 카드를 눌러도 스스로 닫지 않음. 닫기와 이동·기기 사진 연결은 호출자 담당
 */
export const PhotoImportSheet = ({
  onSelectBunchBox,
  onSelectGallery,
  ...rootProps
}: PhotoImportSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    {/* 사진 올리기 시트와 같은 간격(손잡이 아래 14, 제목·카드 사이 10, 카드 사이 6) */}
    <BottomSheet.Content className="gap-0">
      <BottomSheet.Header className="pt-padding-p7">
        <BottomSheet.Title className="typography-heading-2-semibold">
          어디서 사진을 가져올까요?
        </BottomSheet.Title>
        <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
      </BottomSheet.Header>
      <BottomSheet.Body className="mt-s5 gap-s3 pb-s10 flex flex-col">
        <UploadOptionCard
          title="번치 사진함에서 가져오기"
          description="번치 사진함에 저장된 사진을 선택해요."
          onClick={onSelectBunchBox}
        />
        <UploadOptionCard
          icon="user"
          title="내 갤러리에서 가져오기"
          description="휴대폰에 저장된 사진을 선택해요."
          onClick={onSelectGallery}
        />
      </BottomSheet.Body>
    </BottomSheet.Content>
  </BottomSheet.Root>
);

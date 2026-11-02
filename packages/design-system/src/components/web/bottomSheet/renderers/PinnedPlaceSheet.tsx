'use client';

import {
  LineCopyMediumIcon,
  LineHandClickMediumIcon,
  LineTrashcanMediumIcon,
} from '../../../../icons';
import { Button } from '../../../core/button';
import { MenuLabel } from '../../menuLabel';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type PinnedPlaceSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 장소 이름(시트 제목) */
  placeName: string;
  /** 주소(시트 설명) */
  address: string;
  /** 장소 대표 사진. 없으면 회색 자리 */
  imageSrc?: string | undefined;
  onViewBundles: () => void;
  onCopyAddress: () => void;
  onRemove: () => void;
};

/**
 * 콕한 장소 메뉴 시트(Figma Bottom Sheet 09, `3740:78862`): 장소 정보 + 「콕했던 번들 보러가기」·「주소 복사하기」·「콕에서 빼기」 + 「닫기」
 * 항목 선택 시 자동으로 닫지 않음. 복사 결과 안내·화면 이동·빼기 확인은 호출자 담당
 */
export const PinnedPlaceSheet = ({
  placeName,
  address,
  imageSrc,
  onViewBundles,
  onCopyAddress,
  onRemove,
  ...rootProps
}: PinnedPlaceSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      {/* 장소 줄과 메뉴 사이 24, 메뉴 사이 8 */}
      <BottomSheet.Body className="gap-s12 flex flex-col">
        <div className="p-padding-p3 gap-s4 flex items-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="rounded-r4 bg-surface-tertiary size-13 shrink-0 object-cover"
            />
          ) : (
            <span aria-hidden="true" className="rounded-r4 bg-surface-tertiary size-13 shrink-0" />
          )}
          <div className="flex min-w-0 flex-col">
            <BottomSheet.Title
              title={placeName}
              className="typography-body-2-medium text-text-primary truncate"
            >
              {placeName}
            </BottomSheet.Title>
            <BottomSheet.Description
              title={address}
              className="typography-body-4-regular text-text-tertiary truncate"
            >
              {address}
            </BottomSheet.Description>
          </div>
        </div>
        <div className="gap-s4 flex flex-col">
          <MenuLabel
            showChevron={false}
            leftIcon={<LineHandClickMediumIcon className="text-icon-secondary" />}
            onClick={onViewBundles}
          >
            콕했던 번들 보러가기
          </MenuLabel>
          <MenuLabel
            showChevron={false}
            leftIcon={<LineCopyMediumIcon className="text-icon-secondary" />}
            onClick={onCopyAddress}
          >
            주소 복사하기
          </MenuLabel>
          <MenuLabel
            showChevron={false}
            leftIcon={<LineTrashcanMediumIcon className="text-icon-secondary" />}
            onClick={onRemove}
          >
            콕에서 빼기
          </MenuLabel>
        </div>
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button variant="secondarySubtle" onClick={() => rootProps.onOpenChange(false)}>
          닫기
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);

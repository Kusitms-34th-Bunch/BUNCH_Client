'use client';

import type { ReactNode } from 'react';
import { Button } from '../../../core/button';
import { MenuLabel } from '../../menuLabel';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type MoreMenuItem = {
  id: string;
  label: string;
  /** 앞 아이콘. 있으면 오른쪽 화살표를 빼는 모양(Figma Menu Label 앞 아이콘) */
  leftIcon?: ReactNode;
  onSelect: () => void;
};

export type MoreMenuSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  items: MoreMenuItem[];
  /** 화면에 보이지 않는 시트 이름(스크린 리더용). 기본값 `더보기` */
  title?: string | undefined;
  /** 아래 버튼 글자. 기본값 `취소하기` */
  cancelLabel?: string | undefined;
};

/**
 * 더보기 메뉴 시트(Figma Bottom Sheet 06, `2487:46356`): 메뉴 목록 + 「취소하기」
 * 항목 선택 시 자동으로 닫지 않음. 다른 화면을 열기 전 닫기는 호출자 담당
 */
export const MoreMenuSheet = ({
  items,
  title = '더보기',
  cancelLabel = '취소하기',
  ...rootProps
}: MoreMenuSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      <BottomSheet.Title className="sr-only">{title}</BottomSheet.Title>
      <BottomSheet.Body className="gap-s4 flex flex-col">
        {items.map(({ id, label, leftIcon, onSelect }) => (
          <MenuLabel
            key={id}
            className="shrink-0"
            showChevron={!leftIcon}
            leftIcon={leftIcon}
            onClick={onSelect}
          >
            {label}
          </MenuLabel>
        ))}
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button variant="secondary" onClick={() => rootProps.onOpenChange(false)}>
          {cancelLabel}
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);

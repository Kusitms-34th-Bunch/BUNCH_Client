'use client';

import type { CSSProperties, RefObject } from 'react';
import {
  LineCalendarMediumIcon,
  LineDownloadMediumIcon,
  LineTrashcanMediumIcon,
} from '@app/design-system';
import { PhotoActionMenu, type PhotoActionMenuItem } from './PhotoActionMenu';

export type PhotoDetailMenuAction = 'save' | 'date' | 'delete';

const SAVE: PhotoActionMenuItem<PhotoDetailMenuAction> = {
  id: 'save',
  label: '저장',
  icon: <LineDownloadMediumIcon aria-hidden="true" />,
};
const DATE: PhotoActionMenuItem<PhotoDetailMenuAction> = {
  id: 'date',
  label: '날짜 바꾸기',
  icon: <LineCalendarMediumIcon aria-hidden="true" />,
};
const DELETE: PhotoActionMenuItem<PhotoDetailMenuAction> = {
  id: 'delete',
  label: '삭제',
  icon: <LineTrashcanMediumIcon aria-hidden="true" />,
  tone: 'warning',
  dividerBefore: true,
};

// 헤더 아래에서 열리므로 위에서 아래로 내려오며 열림(Figma 사진 상세 설명 표)
const DOWNWARD_MOTION = { '--menu-motion-offset': '-38px' } as CSSProperties;

type PhotoDetailMenuProps = {
  /** 「날짜 바꾸기」·「삭제」는 올린 멤버·관리자만 보임 */
  canManage: boolean;
  open: boolean;
  onClose: () => void;
  onExited: () => void;
  onSelect: (_action: PhotoDetailMenuAction) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/** 사진 상세의 더보기 메뉴: 저장(모두), 날짜 바꾸기·삭제(올린 멤버·관리자만) */
export function PhotoDetailMenu({ canManage, ...props }: PhotoDetailMenuProps) {
  const items = canManage ? [SAVE, DATE, DELETE] : [SAVE];

  return <PhotoActionMenu label="사진 메뉴" items={items} style={DOWNWARD_MOTION} {...props} />;
}

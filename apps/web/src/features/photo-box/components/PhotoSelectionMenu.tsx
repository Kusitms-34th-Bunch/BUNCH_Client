'use client';

import type { RefObject } from 'react';
import {
  LineCalendarMediumIcon,
  LineDownloadMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
} from '@app/design-system';
import type { PhotoMenuAction } from '../hooks/usePhotoSelectionFlow';
import { PhotoActionMenu, type PhotoActionMenuItem } from './PhotoActionMenu';

type PhotoSelectionMenuProps = {
  /** 열림 여부. `false`로 바꾸면 닫히는 모션을 재생하고 끝나면 `onExited` 호출 */
  open: boolean;
  /** Esc·바깥 누름·포커스 이탈로 닫기를 요청할 때 */
  onClose: () => void;
  /** 닫히는 모션이 끝났을 때(호출하는 쪽이 메뉴를 화면에서 뺌) */
  onExited: () => void;
  /** 항목을 골랐을 때(메뉴는 닫기를 요청한 뒤 호출) */
  onSelect: (_action: PhotoMenuAction) => void;
  /** 메뉴를 여는 「⋯」 버튼. 바깥 누름 판정과 닫을 때 포커스 복귀에 사용 */
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const ITEMS: readonly PhotoActionMenuItem<PhotoMenuAction>[] = [
  { id: 'save', label: '저장', icon: <LineDownloadMediumIcon aria-hidden="true" /> },
  { id: 'bundle', label: '번들 만들기', icon: <LinePencilMediumIcon aria-hidden="true" /> },
  { id: 'date', label: '날짜 바꾸기', icon: <LineCalendarMediumIcon aria-hidden="true" /> },
  {
    id: 'delete',
    label: '삭제',
    icon: <LineTrashcanMediumIcon aria-hidden="true" />,
    tone: 'warning',
    dividerBefore: true,
  },
];

/**
 * 선택 모드의 「⋯」 메뉴: 저장·번들 만들기·날짜 바꾸기, 구분선 아래 빨간 삭제(Figma 사진함_08)
 * 위치는 호출하는 쪽이 정함(「⋯」 위 10px, 오른쪽 정렬)
 */
export function PhotoSelectionMenu(props: PhotoSelectionMenuProps) {
  return <PhotoActionMenu label="사진 메뉴" items={ITEMS} {...props} />;
}

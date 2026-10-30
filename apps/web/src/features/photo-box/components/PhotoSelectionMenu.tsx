'use client';

import {
  LineCalendarMediumIcon,
  LineDownloadMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
} from '@app/design-system';
import { Menu, MenuDivider, MenuItem } from '@app/design-system/web';
import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { PhotoMenuAction } from '../hooks/usePhotoSelectionFlow';

type PhotoSelectionMenuProps = {
  /** 열림 여부. `false`로 바꾸면 닫히는 모션을 재생하고 끝나면 `onExited` 호출 */
  open: boolean;
  /** Esc·바깥 누름으로 닫기를 요청할 때 */
  onClose: () => void;
  /** 닫히는 모션이 끝났을 때(호출하는 쪽이 메뉴를 화면에서 뺌) */
  onExited: () => void;
  /** 항목을 골랐을 때(메뉴는 닫기를 요청한 뒤 호출) */
  onSelect: (_action: PhotoMenuAction) => void;
  /** 메뉴를 여는 「⋯」 버튼. 바깥 누름 판정과 닫을 때 포커스 복귀에 사용 */
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * 선택 모드의 「⋯」 메뉴: 저장·번들 만들기·날짜 바꾸기, 구분선 아래 빨간 삭제(Figma 사진함_08)
 * 열리면 첫 항목에 포커스를 주고, Esc·바깥 누름·항목 선택으로 닫음. 닫을 때 포커스는 「⋯」로 돌려 놓음(닫히는 동안 메뉴는 inert)
 * 위치는 호출하는 쪽이 정함(「⋯」 위 10px, 오른쪽 정렬)
 */
export function PhotoSelectionMenu({
  open,
  onClose,
  onExited,
  onSelect,
  triggerRef,
}: PhotoSelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onClose, triggerRef]);

  const close = () => {
    // 닫히는 동안 메뉴는 inert라 안에 있던 포커스가 사라지므로 먼저 「⋯」로 돌려 놓음
    triggerRef.current?.focus();
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const choose = (action: PhotoMenuAction) => {
    close();
    onSelect(action);
  };

  return (
    <Menu
      ref={menuRef}
      aria-label="사진 메뉴"
      open={open}
      onExited={onExited}
      onKeyDown={handleKeyDown}
    >
      <MenuItem icon={<LineDownloadMediumIcon aria-hidden="true" />} onClick={() => choose('save')}>
        저장
      </MenuItem>
      <MenuItem icon={<LinePencilMediumIcon aria-hidden="true" />} onClick={() => choose('bundle')}>
        번들 만들기
      </MenuItem>
      <MenuItem icon={<LineCalendarMediumIcon aria-hidden="true" />} onClick={() => choose('date')}>
        날짜 바꾸기
      </MenuItem>
      <MenuDivider />
      <MenuItem
        tone="warning"
        icon={<LineTrashcanMediumIcon aria-hidden="true" />}
        onClick={() => choose('delete')}
      >
        삭제
      </MenuItem>
    </Menu>
  );
}

'use client';

import {
  LineCalendarMediumIcon,
  LineDownloadMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
} from '@app/design-system';
import { Menu, MenuDivider, MenuItem } from '@app/design-system/web';
import {
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import type { PhotoMenuAction } from '../hooks/usePhotoSelectionFlow';

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

/**
 * 선택 모드의 「⋯」 메뉴: 저장·번들 만들기·날짜 바꾸기, 구분선 아래 빨간 삭제(Figma 사진함_08)
 * 열리면 첫 항목에 포커스를 주고, Esc·바깥 누름·포커스 이탈(Tab)·항목 선택으로 닫음
 * Esc나 항목 선택으로 닫을 때 포커스는 「⋯」로 돌려 놓음(닫히는 동안 메뉴는 inert)
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
  const onCloseRef = useRef(onClose);
  const closeWithFocusRef = useRef(() => {});

  const closeWithFocus = () => {
    // 닫히는 동안 메뉴는 inert라 안에 있던 포커스가 사라지므로 먼저 「⋯」로 돌려 놓음
    triggerRef.current?.focus();
    onCloseRef.current();
  };

  // 리스너가 최신 콜백을 쓰도록 매 렌더 뒤 ref 갱신
  useEffect(() => {
    onCloseRef.current = onClose;
    closeWithFocusRef.current = closeWithFocus;
  });

  // 열릴 때 한 번만 첫 항목에 포커스(부모가 다시 그려져도 옮겨 둔 위치 유지)
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    // 포커스가 메뉴 밖에 있어도 Esc로 닫을 수 있도록 문서에서 처리
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeWithFocusRef.current();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, triggerRef]);

  // Tab 등으로 메뉴와 「⋯」 밖으로 포커스가 나가면 닫음
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (menuRef.current?.contains(next) || triggerRef.current?.contains(next)) return;
    onCloseRef.current();
  };

  // Tab은 포커스가 자연스럽게 다음 요소로 넘어가도록 두고 메뉴만 닫음(「⋯」로 가도 열려 있지 않도록)
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') onCloseRef.current();
  };

  const choose = (action: PhotoMenuAction) => {
    closeWithFocus();
    onSelect(action);
  };

  return (
    <Menu
      ref={menuRef}
      aria-label="사진 메뉴"
      open={open}
      onExited={onExited}
      onBlur={handleBlur}
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

'use client';

import { Menu, MenuDivider, MenuItem } from '@app/design-system/web';
import {
  Fragment,
  useEffect,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

export type PhotoActionMenuItem<Id extends string> = {
  id: Id;
  label: string;
  /** 글자 앞 아이콘(장식이라 `aria-hidden` 아이콘 전달) */
  icon: ReactNode;
  /** 삭제처럼 되돌리기 어려운 동작은 `warning`(빨강) */
  tone?: 'warning';
  /** 이 항목 앞에 구분선(Figma는 삭제 앞에만) */
  dividerBefore?: boolean;
};

type PhotoActionMenuProps<Id extends string> = {
  /** 메뉴의 접근성 이름(예: "사진 메뉴") */
  label: string;
  items: readonly PhotoActionMenuItem<Id>[];
  /** 열림 여부. `false`로 바꾸면 닫히는 모션을 재생하고 끝나면 `onExited` 호출 */
  open: boolean;
  /** Esc·바깥 누름·포커스 이탈로 닫기를 요청할 때 */
  onClose: () => void;
  /** 닫히는 모션이 끝났을 때(호출하는 쪽이 메뉴를 화면에서 뺌) */
  onExited: () => void;
  /** 항목을 골랐을 때(메뉴는 닫기를 요청한 뒤 호출) */
  onSelect: (_id: Id) => void;
  /** 메뉴를 여는 버튼. 바깥 누름 판정과 닫을 때 포커스 복귀에 사용 */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** 모션 방향 등 위치에 따른 CSS 변수(예: `--menu-motion-offset`) */
  style?: CSSProperties | undefined;
};

/**
 * 사진 동작 메뉴(선택 모드 「⋯」, 사진 상세 더보기): DS `Menu`에 항목을 받아 그리고 키보드·포커스 동작을 맡음
 * 열리면 첫 항목에 포커스를 주고, Esc(문서 어디서든)·바깥 누름·포커스 이탈(Tab)·항목 선택으로 닫음
 * Esc나 항목 선택으로 닫을 때 포커스는 여는 버튼으로 돌려 놓음(닫히는 동안 메뉴는 inert)
 * 위치는 호출하는 쪽이 정함
 */
export function PhotoActionMenu<Id extends string>({
  label,
  items,
  open,
  onClose,
  onExited,
  onSelect,
  triggerRef,
  style,
}: PhotoActionMenuProps<Id>) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeWithFocusRef = useRef(() => {});

  const closeWithFocus = () => {
    // 닫히는 동안 메뉴는 inert라 안에 있던 포커스가 사라지므로 먼저 여는 버튼으로 돌려 놓음
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

  // 메뉴와 여는 버튼 밖으로 포커스가 나가면 닫음
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (menuRef.current?.contains(next) || triggerRef.current?.contains(next)) return;
    onCloseRef.current();
  };

  // Tab은 포커스가 자연스럽게 다음 요소로 넘어가도록 두고 메뉴만 닫음(여는 버튼으로 가도 열려 있지 않도록)
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') onCloseRef.current();
  };

  const choose = (id: Id) => {
    closeWithFocus();
    onSelect(id);
  };

  return (
    <Menu
      ref={menuRef}
      aria-label={label}
      open={open}
      onExited={onExited}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={style}
    >
      {items.map((item) => (
        <Fragment key={item.id}>
          {item.dividerBefore ? <MenuDivider /> : null}
          <MenuItem
            {...(item.tone ? { tone: item.tone } : {})}
            icon={item.icon}
            onClick={() => choose(item.id)}
          >
            {item.label}
          </MenuItem>
        </Fragment>
      ))}
    </Menu>
  );
}

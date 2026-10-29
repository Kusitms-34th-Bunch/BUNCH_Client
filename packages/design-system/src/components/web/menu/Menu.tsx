import type { ComponentProps, KeyboardEvent } from 'react';
import { cn } from '../../../utils';

export type MenuProps = Omit<ComponentProps<'div'>, 'role'> & {
  /** 접근성 이름(예: "번들 메뉴"). 보이는 제목이 없으므로 필수 */
  'aria-label': string;
};

const itemSelector = '[role="menuitem"]';

/**
 * 메뉴 컨테이너(Figma `Menu`): `MenuItem`과 `MenuDivider`를 담는 `role="menu"` 카드
 * 방향키·Home·End로 항목 포커스를 옮김. 메뉴와 항목은 tabIndex=-1이라 Tab으로 들어올 수 없으므로 열 때 호출하는 쪽이 메뉴(ref.focus()) 또는 첫 항목에 포커스를 주어야 함
 * 열고 닫는 위치·상태, Esc·바깥 클릭·Tab 이탈 닫기, 트리거의 aria-haspopup="menu"·aria-expanded도 호출하는 쪽이 맡음
 */
export const Menu = ({ className, children, onKeyDown, ...props }: MenuProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector));
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (current + 1) % items.length;
        break;
      case 'ArrowUp':
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      role="menu"
      tabIndex={-1}
      className={cn(
        'gap-s2 rounded-r8 bg-surface-primary p-s4 focus-visible:outline-border-brand flex w-43 flex-col shadow-[0_6px_8.5px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:-outline-offset-2',
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
};

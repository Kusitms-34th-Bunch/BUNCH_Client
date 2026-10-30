import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type MenuItemTone = 'default' | 'warning';

export type MenuItemProps = Omit<ComponentProps<'button'>, 'disabled' | 'type' | 'role'> & {
  /** 접근성 이름이 되는 글자(예: "저장") */
  children: ReactNode;
  /** Figma Default·Warning. warning은 삭제처럼 되돌리기 어려운 동작에 사용 */
  tone?: MenuItemTone;
  /** 글자 앞 아이콘(Medium 20px). 장식이라 호출하는 쪽이 aria-hidden 아이콘 전달 */
  icon?: ReactNode;
};

/**
 * 메뉴 한 줄(Figma `Menu Item`): `Menu` 안에서 쓰는 `role="menuitem"` 버튼
 * 누르는 동안 overlay-hover(10%) 오버레이, 75ms ease-out. tabIndex는 -1이고 포커스 이동은 `Menu`가 담당
 */
export const MenuItem = ({
  className,
  children,
  tone = 'default',
  icon,
  ...props
}: MenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    tabIndex={-1}
    className={cn(
      'gap-s4 rounded-r6 px-s8 py-s5 typography-login-button relative isolate flex min-h-11 w-full cursor-pointer touch-manipulation items-center overflow-clip text-left font-(--semantic-font-weights-pretendard-1)',
      'before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      'active:before:opacity-100',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      tone === 'warning' ? 'text-system-fail-text' : 'text-text-secondary',
      className,
    )}
    {...props}
  >
    {icon ? (
      <span aria-hidden="true" className="inline-flex shrink-0">
        {icon}
      </span>
    ) : null}
    <span className="min-w-0 flex-1">{children}</span>
  </button>
);

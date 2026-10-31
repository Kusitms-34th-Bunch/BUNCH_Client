import type { ComponentProps, ReactNode } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type MenuLabelProps = Omit<ComponentProps<'button'>, 'children' | 'type'> & {
  /** 접근성 이름이 되는 글자 */
  children: ReactNode;
};

/**
 * 오른쪽 화살표가 있는 메뉴 한 줄(Figma `Menu Label`): 다른 화면·동작으로 넘어가는 목록 항목
 * 팝오버 메뉴의 `MenuItem`(role="menuitem")과 달리 일반 버튼. 누르는 동안 overlay-pressed(20%)
 */
export const MenuLabel = ({ children, className, ...props }: MenuLabelProps) => (
  <button
    type="button"
    {...props}
    className={cn(
      'rounded-r4 p-padding-p5 gap-s4 relative isolate flex w-full cursor-pointer touch-manipulation items-center justify-between text-left',
      'before:rounded-r4 before:bg-overlay-pressed before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out active:before:opacity-100 motion-reduce:before:transition-none',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
  >
    <span className="typography-body-1-medium text-text-secondary min-w-0 wrap-break-word break-keep">
      {children}
    </span>
    <LineChevronRightMediumIcon className="text-icon-quaternary shrink-0" />
  </button>
);

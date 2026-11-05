import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type MenuDividerProps = Omit<ComponentProps<'div'>, 'role' | 'children'>;

/**
 * 메뉴 항목 묶음 사이 구분선(Figma `Divider`, 0.4px `border-secondary`)
 * `Menu` 안에서 나누고 싶은 위치에 자식으로 넣음(예: 삭제 항목 앞). 위아래 간격은 `Menu`의 항목 간격(4px)과 같음
 */
export const MenuDivider = ({ className, ...props }: MenuDividerProps) => (
  <div
    role="separator"
    className={cn('bg-border-secondary h-[0.4px] shrink-0', className)}
    {...props}
  />
);
